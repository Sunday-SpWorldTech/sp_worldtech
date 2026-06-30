const crypto = require('crypto');
const SpTokenVoucher = require('../models/SpTokenVoucher');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const SystemWallet = require('../models/SystemWallet');
const Application = require('../models/Application');
const { initializePaystackPayment, verifyPaystackTransaction, isConfigured } = require('../services/paystackService');

const ALLOWED_AMOUNTS_NGN = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 250000, 500000, 1000000];
const ALLOWED_AMOUNTS_USD = [5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000];

function hashCode(code) {
  return crypto.createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');
}

function makeVoucherCode() {
  const raw = crypto.randomBytes(12).toString('hex').toUpperCase();
  return `SP-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}`;
}

function maskCode(code = '') {
  return code ? `${code.slice(0, 7)}••••••••${code.slice(-5)}` : '';
}

function feePercent() {
  return Number(process.env.SP_TOKEN_FEE_PERCENT || 3);
}

async function ensureWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  return wallet;
}

async function ensureSystemWallet() {
  let wallet = await SystemWallet.findOne({ name: 'admin_wallet' });
  if (!wallet) wallet = await SystemWallet.create({ name: 'admin_wallet' });
  return wallet;
}

function validateAmount(amount, currency) {
  const value = Number(amount || 0);
  const list = currency === 'USD' ? ALLOWED_AMOUNTS_USD : ALLOWED_AMOUNTS_NGN;
  if (!list.includes(value)) {
    throw new Error(`${currency} SP Token amount is not supported. Choose one of the published prices.`);
  }
  return value;
}

exports.getCatalog = async (_req, res) => {
  res.json({
    feePercent: feePercent(),
    currencies: {
      NGN: ALLOWED_AMOUNTS_NGN.map(amount => ({ amount, total: amount + (amount * feePercent() / 100) })),
      USD: ALLOWED_AMOUNTS_USD.map(amount => ({ amount, total: amount + (amount * feePercent() / 100) }))
    },
    paystackReady: isConfigured(),
    note: 'SP Tokens are one-time-use balance tokens generated during deposit or withdrawal workflows. Deposit tokens credit dashboard wallet balance after redemption.'
  });
};

exports.createCheckout = async (req, res) => {
  try {
    const currency = String(req.body.currency || 'NGN').toUpperCase() === 'USD' ? 'USD' : 'NGN';
    const amount = validateAmount(req.body.amount, currency);
    const percent = feePercent();
    const feeAmount = Number(((amount * percent) / 100).toFixed(2));
    const totalPaid = Number((amount + feeAmount).toFixed(2));
    const reference = `SPTOKEN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const voucher = await SpTokenVoucher.create({
      user: req.user._id,
      amount,
      currency,
      feePercent: percent,
      feeAmount,
      totalPaid,
      paystackReference: reference,
      status: 'pending_payment',
      metadata: { source: 'sp_token_wallet_deposit', flow: 'paystack_to_sp_token_to_wallet' }
    });

    const callbackUrl = req.body.callbackUrl || `${process.env.CLIENT_URL || process.env.FRONTEND_URL || ''}/giftcards.html?reference=${reference}`;
    const checkout = await initializePaystackPayment({
      email: req.user.email,
      amount: totalPaid,
      currency,
      reference,
      callbackUrl,
      metadata: { userId: String(req.user._id), voucherId: String(voucher._id), product: 'SP Token Wallet Deposit', walletCreditAmount: amount, feeAmount, feePercent: percent }
    });

    if (!checkout.attempted) {
      return res.status(503).json({ message: checkout.message || 'Paystack checkout is not configured yet.' });
    }

    res.status(201).json({
      message: 'SP Token deposit checkout created. Complete payment, then verify to reveal the one-time balance token.',
      reference,
      amount,
      currency,
      feeAmount,
      totalPaid,
      authorizationUrl: checkout.data?.authorization_url,
      accessCode: checkout.data?.access_code
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.verifyCheckout = async (req, res) => {
  try {
    const reference = req.params.reference || req.body.reference;
    const voucher = await SpTokenVoucher.findOne({ paystackReference: reference, user: req.user._id });
    if (!voucher) return res.status(404).json({ message: 'SP Token checkout was not found for this user.' });

    if (voucher.status === 'active' && voucher.codeMasked) {
      return res.json({ message: 'SP Token voucher is already active.', voucher: { amount: voucher.amount, currency: voucher.currency, status: voucher.status, codeMasked: voucher.codeMasked } });
    }

    const verified = await verifyPaystackTransaction(reference);
    const status = String(verified.data?.status || '').toLowerCase();
    voucher.paystackStatus = status || 'unknown';
    voucher.metadata = { ...(voucher.metadata || {}), paystackVerify: verified.data || verified };

    if (status !== 'success') {
      await voucher.save();
      return res.status(402).json({ message: 'Payment is not successful yet.', paystackStatus: voucher.paystackStatus });
    }

    const paidMajor = Number(verified.data?.amount || 0) / 100;
    if (paidMajor + 0.01 < Number(voucher.totalPaid || 0)) {
      await voucher.save();
      return res.status(400).json({ message: 'Payment amount is lower than the SP Token checkout total.' });
    }

    const code = makeVoucherCode();
    voucher.codeHash = hashCode(code);
    voucher.codeMasked = maskCode(code);
    voucher.status = 'active';
    await voucher.save();

    const systemWallet = await ensureSystemWallet();
    if (voucher.currency === 'USD') systemWallet.productFeeUsd += Number(voucher.feeAmount || 0);
    if (voucher.currency === 'NGN') systemWallet.productFeeNgn += Number(voucher.feeAmount || 0);
    await systemWallet.save();

    await Transaction.create({
      user: req.user._id,
      type: 'sp_token_fee',
      amount: voucher.feeAmount,
      currency: voucher.currency,
      direction: 'credit',
      wallet: 'admin',
      description: 'SP Token deposit service fee recorded for admin wallet',
      meta: { paystackReference: reference, voucherId: voucher._id, feePercent: voucher.feePercent }
    });

    res.json({
      message: 'Payment verified. Your one-time SP Token balance code is ready. Copy it now and redeem it into your wallet.',
      voucher: { code, amount: voucher.amount, currency: voucher.currency, feeAmount: voucher.feeAmount, totalPaid: voucher.totalPaid, status: voucher.status }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.redeem = async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ message: 'Enter your SP Token balance code.' });
    const voucher = await SpTokenVoucher.findOne({ codeHash: hashCode(code) });
    if (!voucher) return res.status(404).json({ message: 'Invalid SP Token balance code.' });
    if (voucher.status !== 'active') return res.status(400).json({ message: `This SP Token is ${voucher.status}. One voucher can only be redeemed once.` });
    if (String(voucher.user) !== String(req.user._id)) return res.status(403).json({ message: 'This SP Token was not issued to your account.' });

    const wallet = await ensureWallet(req.user._id);
    if (voucher.currency === 'USD') wallet.usdBalance += Number(voucher.amount || 0);
    if (voucher.currency === 'NGN') wallet.ngnBalance += Number(voucher.amount || 0);
    await wallet.save();

    voucher.status = 'redeemed';
    voucher.redeemedBy = req.user._id;
    voucher.redeemedAt = new Date();
    await voucher.save();

    await Transaction.create({
      user: req.user._id,
      type: 'sp_token_wallet_credit',
      amount: voucher.amount,
      currency: voucher.currency,
      direction: 'credit',
      wallet: 'user',
      description: voucher.purpose === 'job_payout' ? 'SP Token paid job voucher redeemed into dashboard wallet balance' : 'SP Token deposit code redeemed into dashboard wallet balance',
      meta: { voucherId: voucher._id, paystackReference: voucher.paystackReference, purpose: voucher.purpose, applicationId: voucher.application }
    });

    if (voucher.application) {
      await Application.findByIdAndUpdate(voucher.application, {
        payoutVoucherStatus: 'redeemed',
        paidAt: new Date()
      }).catch(() => null);
    }

    res.json({ message: 'SP Token balance code redeemed successfully. Wallet balance updated.', wallet, voucher: { amount: voucher.amount, currency: voucher.currency, purpose: voucher.purpose, status: voucher.status } });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.myVouchers = async (req, res) => {
  const vouchers = await SpTokenVoucher.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .select('-codeHash +claimCode')
    .populate('application', 'status payoutVoucherStatus');
  res.json({ vouchers: vouchers.map(v => {
    const item = v.toObject();
    if (item.purpose !== 'job_payout' || item.status !== 'active') delete item.claimCode;
    return item;
  }) });
};
