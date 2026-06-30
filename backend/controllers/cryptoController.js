const crypto = require('crypto');
const CryptoOrder = require('../models/CryptoOrder');
const CryptoTransaction = require('../models/CryptoTransaction');
const CryptoWallet = require('../models/CryptoWallet');
const CryptoWithdrawal = require('../models/CryptoWithdrawal');
const CryptoMarketCache = require('../models/CryptoMarketCache');
const PaymentTransaction = require('../models/PaymentTransaction');
const luno = require('../services/lunoService');
const { initializePaystackPayment, isConfigured: paystackConfigured } = require('../services/paystackService');

const DEFAULT_CURRENCY = process.env.CRYPTO_DEFAULT_CURRENCY || 'NGN';
const MARKUP = Number(process.env.CRYPTO_MARKUP_PERCENT || 3);

function ref(prefix = 'SPC') {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function firstUrl(value = '') {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean)[0] || '';
}

function frontendUrl() {
  return firstUrl(process.env.FRONTEND_URL) || firstUrl(process.env.CLIENT_URL) || 'https://spworldtech.com';
}

function cryptoCallback(reference) {
  return `${frontendUrl()}/crypto-exchange.html?reference=${encodeURIComponent(reference)}`;
}

function parsePair(pair = '') {
  const clean = String(pair || '').toUpperCase();
  const quote = ['NGN', 'ZAR', 'EUR', 'GBP', 'USD', 'USDT'].find(q => clean.endsWith(q));
  return { pair: clean, baseAsset: quote ? clean.slice(0, -quote.length) : clean.slice(0, 3), quoteAsset: quote || DEFAULT_CURRENCY };
}

function normalizeTicker(item = {}) {
  const pair = item.pair || item.market || '';
  return {
    pair,
    bid: Number(item.bid || 0),
    ask: Number(item.ask || 0),
    lastTrade: Number(item.last_trade || item.lastTrade || item.ask || item.bid || 0),
    rolling24HourVolume: Number(item.rolling_24_hour_volume || item.rolling24HourVolume || 0),
    raw: item,
    ...parsePair(pair)
  };
}

async function getMarketPrice(pair) {
  const result = await luno.getTicker(pair);
  if (!result.attempted) return result;
  const ticker = normalizeTicker(result.data.tickers ? result.data.tickers[0] : result.data);
  return { attempted: true, configured: true, ticker };
}

function calculateQuote({ lunoMarketPrice, amount }) {
  const price = Number(lunoMarketPrice || 0);
  const requestedAmount = Number(amount || 0);
  const fee = requestedAmount * (MARKUP / 100);
  const total = requestedAmount + fee;
  const estimatedCryptoAmount = price > 0 ? requestedAmount / price : 0;
  return { price, requestedAmount, fee, total, estimatedCryptoAmount };
}

exports.markets = async (_req, res) => {
  try {
    const result = await luno.getMarkets();
    if (!result.attempted) {
      const cached = await CryptoMarketCache.find().sort({ fetchedAt: -1 }).limit(50);
      return res.json({ configured: false, message: result.message, markets: cached });
    }
    const tickers = (result.data.tickers || []).map(normalizeTicker);
    await Promise.all(tickers.map(t => CryptoMarketCache.findOneAndUpdate(
      { pair: t.pair },
      { ...t, fetchedAt: new Date() },
      { upsert: true, new: true }
    )));
    res.json({ configured: true, markets: tickers });
  } catch (error) {
    const cached = await CryptoMarketCache.find().sort({ fetchedAt: -1 }).limit(50);
    res.status(cached.length ? 200 : 502).json({ configured: luno.credentialsReady(), message: error.message, markets: cached, fromCache: Boolean(cached.length) });
  }
};

exports.prices = async (req, res) => {
  try {
    const { pair } = req.query;
    const result = pair ? await getMarketPrice(pair) : await luno.getMarkets();
    if (!result.attempted) return res.status(503).json({ configured: false, message: result.message, prices: [] });
    if (pair) return res.json({ configured: true, price: result.ticker });
    res.json({ configured: true, prices: (result.data.tickers || []).map(normalizeTicker) });
  } catch (error) {
    res.status(502).json({ message: error.message });
  }
};

exports.calculate = async (req, res) => {
  try {
    const { pair, amount } = req.body;
    if (!pair || !Number(amount)) return res.status(400).json({ message: 'Pair and amount are required.' });
    const result = await getMarketPrice(pair);
    if (!result.attempted) return res.status(503).json({ configured: false, message: result.message });
    const quote = calculateQuote({ lunoMarketPrice: result.ticker.ask || result.ticker.lastTrade, amount });
    res.json({ pair: String(pair).toUpperCase(), currency: result.ticker.quoteAsset || DEFAULT_CURRENCY, lunoMarketPrice: quote.price, serviceFeePercent: MARKUP, serviceFee: quote.fee, totalUserPays: quote.total, estimatedCryptoAmount: quote.estimatedCryptoAmount });
  } catch (error) {
    res.status(502).json({ message: error.message });
  }
};

exports.buy = async (req, res) => {
  try {
    const { pair, amount, kyc = {} } = req.body;
    if (!pair || !Number(amount)) return res.status(400).json({ message: 'Pair and amount are required.' });
    const priceResult = await getMarketPrice(pair);
    if (!priceResult.attempted) return res.status(503).json({ message: priceResult.message });
    const quote = calculateQuote({ lunoMarketPrice: priceResult.ticker.ask || priceResult.ticker.lastTrade, amount });
    const reference = ref('SPC-BUY');
    const order = await CryptoOrder.create({
      user: req.user._id,
      type: 'buy',
      ...parsePair(pair),
      amount: quote.requestedAmount,
      currency: priceResult.ticker.quoteAsset || DEFAULT_CURRENCY,
      lunoMarketPrice: quote.price,
      serviceFeePercent: MARKUP,
      serviceFee: quote.fee,
      totalAmount: quote.total,
      estimatedCryptoAmount: quote.estimatedCryptoAmount,
      paystackReference: reference,
      status: 'pending_payment',
      kyc
    });
    if (!paystackConfigured()) {
      return res.status(503).json({ message: 'Secure crypto deposit service is not available yet.', orderId: order._id, reference });
    }
    const payment = await initializePaystackPayment({
      email: req.user.email,
      amount: quote.total,
      currency: priceResult.ticker.quoteAsset === 'NGN' ? 'NGN' : DEFAULT_CURRENCY,
      reference,
      callbackUrl: cryptoCallback(reference),
      metadata: { purpose: 'crypto_buy', orderId: String(order._id), userId: String(req.user._id), pair: String(pair).toUpperCase() }
    });
    await PaymentTransaction.create({ user: req.user._id, order: order._id, reference, amount: quote.total, currency: DEFAULT_CURRENCY, authorizationUrl: payment.data?.authorization_url, accessCode: payment.data?.access_code, status: 'pending', providerResponse: payment.data });
    await CryptoTransaction.create({ user: req.user._id, order: order._id, type: 'deposit', pair: String(pair).toUpperCase(), amount: quote.requestedAmount, fee: quote.fee, total: quote.total, reference, provider: 'paystack', status: 'pending', detail: 'Secure crypto buy payment initiated.' });
    res.json({ message: 'Crypto buy payment initialized. Complete secure checkout before the order is processed.', order, payment: payment.data, quote });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sell = async (req, res) => {
  try {
    const { pair, cryptoAmount, receivingAccount = {} } = req.body;
    if (!pair || !Number(cryptoAmount)) return res.status(400).json({ message: 'Pair and crypto amount are required.' });
    const order = await CryptoOrder.create({ user: req.user._id, type: 'sell', ...parsePair(pair), amount: Number(cryptoAmount), status: 'pending', kyc: { receivingAccount } });
    await CryptoTransaction.create({ user: req.user._id, order: order._id, type: 'sell', pair: String(pair).toUpperCase(), amount: Number(cryptoAmount), reference: ref('SPC-SELL'), provider: 'spworldtech', status: 'pending', detail: 'Sell request submitted for admin processing.' });
    res.status(201).json({ message: 'Sell request submitted. It will only be completed after provider confirmation.', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.initiateDeposit = async (req, res) => {
  try {
    const { amount, currency = DEFAULT_CURRENCY } = req.body;
    if (!Number(amount)) return res.status(400).json({ message: 'Deposit amount is required.' });
    if (!paystackConfigured()) return res.status(503).json({ message: 'Secure payment service is not available yet.' });
    const reference = ref('SPC-DEP');
    const payment = await initializePaystackPayment({ email: req.user.email, amount, currency, reference, callbackUrl: cryptoCallback(reference), metadata: { purpose: 'crypto_deposit', userId: String(req.user._id) } });
    const record = await PaymentTransaction.create({ user: req.user._id, reference, amount, currency, status: 'pending', authorizationUrl: payment.data?.authorization_url, accessCode: payment.data?.access_code, providerResponse: payment.data });
    res.json({ message: 'Deposit checkout initialized.', payment: payment.data, record });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.verifyDeposit = async (req, res) => {
  try {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ message: 'Payment reference is required.' });
    const existing = await PaymentTransaction.findOne({ reference });
    if (existing?.status === 'success') return res.json({ message: 'Payment already verified.', payment: existing });
    if (!paystackConfigured()) return res.status(503).json({ message: 'Secure payment service is not available yet.' });
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status === false) return res.status(400).json({ message: data.message || 'Payment verification failed.' });
    const isSuccess = data.data?.status === 'success';
    const payment = await PaymentTransaction.findOneAndUpdate({ reference }, { status: isSuccess ? 'success' : data.data?.status || 'failed', providerResponse: data.data, verifiedAt: new Date(), channel: data.data?.channel }, { new: true, upsert: false });
    const order = await CryptoOrder.findOne({ paystackReference: reference });
    if (order && isSuccess && order.status !== 'completed') {
      order.paystackStatus = 'success';
      order.status = 'paid';
      try {
        const lunoOrder = await luno.createMarketOrder({ pair: order.pair, type: 'BUY', counterVolume: order.amount });
        if (lunoOrder.attempted) {
          order.status = 'processing';
          order.lunoOrderId = lunoOrder.data.order_id || lunoOrder.data.id;
          order.lunoResponse = lunoOrder.data;
        }
      } catch (error) {
        order.status = 'paid';
        order.failureReason = `Payment verified but crypto order was not completed automatically: ${error.message}`;
      }
      await order.save();
      await CryptoTransaction.updateMany({ reference }, { status: order.status, providerId: order.lunoOrderId, metadata: order.lunoResponse });
    }
    res.json({ message: isSuccess ? 'Payment verified.' : 'Payment not successful yet.', payment, order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const { asset, amount, address, network } = req.body;
    if (!asset || !Number(amount) || !address) return res.status(400).json({ message: 'Asset, amount and withdrawal address are required.' });
    const riskLevel = Number(amount) >= Number(process.env.CRYPTO_HIGH_RISK_WITHDRAWAL_LIMIT || 1000) ? 'high' : 'normal';
    const withdrawal = await CryptoWithdrawal.create({ user: req.user._id, asset, amount, address, network, riskLevel, status: 'pending' });
    await CryptoTransaction.create({ user: req.user._id, type: 'withdrawal', asset, amount, reference: ref('SPC-WD'), provider: 'spworldtech', status: 'pending', detail: 'Withdrawal submitted for admin approval.' });
    res.status(201).json({ message: 'Withdrawal request submitted for admin approval.', withdrawal });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.transactions = async (req, res) => {
  const transactions = await CryptoTransaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ transactions });
};

exports.portfolio = async (req, res) => {
  try {
    const wallets = await CryptoWallet.find({ user: req.user._id }).sort({ asset: 1 });
    let balances = null;
    try { balances = await luno.getBalances(); } catch (_error) { balances = null; }
    res.json({ wallets, lunoConfigured: luno.credentialsReady(), lunoBalances: balances?.data?.balance || [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminOrders = async (_req, res) => {
  const orders = await CryptoOrder.find().populate('user', 'name email role').sort({ createdAt: -1 }).limit(200);
  const fees = orders.reduce((sum, order) => sum + Number(order.serviceFee || 0), 0);
  res.json({ orders, summary: { totalOrders: orders.length, serviceFees: fees, lunoConfigured: luno.credentialsReady(), paystackConfigured: paystackConfigured() } });
};

exports.adminWithdrawals = async (_req, res) => {
  const withdrawals = await CryptoWithdrawal.find().populate('user', 'name email role').sort({ createdAt: -1 }).limit(200);
  res.json({ withdrawals });
};

exports.approveWithdrawal = async (req, res) => {
  const withdrawal = await CryptoWithdrawal.findById(req.params.id);
  if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found.' });
  withdrawal.status = 'approved';
  withdrawal.adminNote = req.body.note || withdrawal.adminNote;
  await withdrawal.save();
  res.json({ message: 'Withdrawal approved. Process with provider only after final compliance check.', withdrawal });
};

exports.rejectWithdrawal = async (req, res) => {
  const withdrawal = await CryptoWithdrawal.findById(req.params.id);
  if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found.' });
  withdrawal.status = 'rejected';
  withdrawal.adminNote = req.body.note || 'Rejected by admin.';
  await withdrawal.save();
  res.json({ message: 'Withdrawal rejected.', withdrawal });
};
