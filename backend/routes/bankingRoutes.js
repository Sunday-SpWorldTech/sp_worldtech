const router = require('express').Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Wallet = require('../models/Wallet');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ProductRequest = require('../models/ProductRequest');
const SupportTicket = require('../models/SupportTicket');
const SystemWallet = require('../models/SystemWallet');
const { protect, authorize } = require('../middleware/auth');
const { submitToStrowallet } = require('../services/strowalletService');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const ref = (prefix = 'SPW') => `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

async function ensureWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  return wallet;
}

async function verifyPin(userId, pin) {
  const user = await User.findById(userId).select('+operationsPinHash');
  if (!user?.operationsPinHash) return { ok: false, message: 'Create your calculator PIN before using Banking.' };
  if (!pin) return { ok: false, message: 'Wallet PIN is required.' };
  const ok = await bcrypt.compare(String(pin), user.operationsPinHash);
  return ok ? { ok: true } : { ok: false, message: 'Invalid wallet PIN.' };
}

function providerConfigured() {
  return Boolean((process.env.STROWALLET_PUBLIC_KEY || process.env.STROWALLET_API_KEY) && process.env.STROWALLET_SECRET_KEY);
}

async function recordTransaction(payload) {
  return Transaction.create({
    ...payload,
    meta: { ...(payload.meta || {}), reference: payload.meta?.reference || ref('TRX') }
  });
}

router.get('/dashboard', protect, authorize('user'), asyncHandler(async (req, res) => {
  const wallet = await ensureWallet(req.user._id);
  const productRequests = await ProductRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30);
  const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(25);
  const virtualAccounts = productRequests.filter((item) => /bank account|virtual account/i.test(item.productType));
  const cardRequests = productRequests.filter((item) => /card/i.test(item.productType));
  res.json({
    wallet,
    user: { fullName: req.user.fullName, email: req.user.email, tokenId: req.user.operationsTokenId },
    productRequests,
    virtualAccounts,
    cardRequests,
    transactions,
    provider: { strowalletReady: providerConfigured() }
  });
}));

router.get('/transactions', protect, authorize('user'), asyncHandler(async (req, res) => {
  const { from, to, search } = req.query;
  const query = { user: req.user._id };
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }
  if (search) query.$or = [
    { description: new RegExp(String(search), 'i') },
    { 'meta.reference': new RegExp(String(search), 'i') },
    { type: new RegExp(String(search), 'i') }
  ];
  const transactions = await Transaction.find(query).sort({ createdAt: -1 }).limit(300);
  res.json({ transactions });
}));

router.post('/transfer/internal', protect, authorize('user'), asyncHandler(async (req, res) => {
  const { recipient, amount, description, pin } = req.body;
  const value = Number(amount || 0);
  if (!recipient || value <= 0) return res.status(400).json({ message: 'Recipient and valid amount are required.' });
  const pinCheck = await verifyPin(req.user._id, pin);
  if (!pinCheck.ok) return res.status(400).json({ message: pinCheck.message });

  const receiver = await User.findOne({ $or: [{ email: String(recipient).toLowerCase() }, { operationsTokenId: recipient }] });
  if (!receiver) return res.status(404).json({ message: 'Recipient Banking user was not found.' });
  if (String(receiver._id) === String(req.user._id)) return res.status(400).json({ message: 'You cannot transfer to yourself.' });

  const senderWallet = await ensureWallet(req.user._id);
  const receiverWallet = await ensureWallet(receiver._id);
  if (senderWallet.ngnBalance < value) return res.status(400).json({ message: 'Insufficient NGN wallet balance.' });

  const reference = ref('SPW-INTERNAL');
  senderWallet.ngnBalance -= value;
  receiverWallet.ngnBalance += value;
  await senderWallet.save();
  await receiverWallet.save();
  await recordTransaction({ user: req.user._id, type: 'internal_transfer_out', amount: value, currency: 'NGN', direction: 'debit', wallet: 'user', description: description || `Transfer to ${receiver.fullName}`, status: 'completed', meta: { reference, recipient: receiver.email } });
  await recordTransaction({ user: receiver._id, type: 'internal_transfer_in', amount: value, currency: 'NGN', direction: 'credit', wallet: 'user', description: description || `Transfer from ${req.user.fullName}`, status: 'completed', meta: { reference, sender: req.user.email } });
  res.json({ message: 'Banking user transfer completed.', reference });
}));

router.post('/transfer/bank', protect, authorize('user'), asyncHandler(async (req, res) => {
  const { bankName, accountNumber, amount, narration, pin } = req.body;
  const value = Number(amount || 0);
  if (!bankName || !accountNumber || value <= 0) return res.status(400).json({ message: 'Bank name, account number, and amount are required.' });
  const pinCheck = await verifyPin(req.user._id, pin);
  if (!pinCheck.ok) return res.status(400).json({ message: pinCheck.message });
  if (!providerConfigured()) return res.status(503).json({ message: 'Bank transfer service is currently unavailable. Please check back shortly.' });

  const wallet = await ensureWallet(req.user._id);
  if (wallet.ngnBalance < value) return res.status(400).json({ message: 'Insufficient NGN wallet balance.' });
  const providerResult = await submitToStrowallet({ productType: 'Fund Transfer', amount: value, narration, customerEmail: req.user.email, customerName: req.user.fullName, bankName, accountNumber });
  if (providerResult.status === 'failed') return res.status(502).json({ message: providerResult.message || 'Provider transfer request failed.' });
  wallet.ngnBalance -= value;
  await wallet.save();
  const reference = providerResult.reference || ref('SPW-BANK');
  await recordTransaction({ user: req.user._id, type: 'bank_transfer', amount: value, currency: 'NGN', direction: 'debit', wallet: 'user', description: narration || `Transfer to ${bankName} ${accountNumber}`, status: 'pending', meta: { reference, providerStatus: providerResult.status } });
  res.json({ message: 'Bank transfer request submitted. Final status depends on provider confirmation.', reference });
}));

router.post('/virtual-accounts/:country', protect, authorize('user'), asyncHandler(async (req, res) => {
  const country = String(req.params.country || '').toLowerCase();
  const isUsa = ['usa', 'us', 'united-states'].includes(country);
  const productType = isUsa ? 'USA Virtual Bank Account' : 'Nigeria Virtual Bank Account';
  const feeAmount = isUsa ? 10 : 0;
  const feeCurrency = isUsa ? 'USD' : 'NGN';
  const pinCheck = await verifyPin(req.user._id, req.body.pin);
  if (!pinCheck.ok) return res.status(400).json({ message: pinCheck.message });
  const wallet = await ensureWallet(req.user._id);
  if (isUsa && wallet.usdBalance < 10) return res.status(400).json({ message: 'Insufficient USD wallet balance. USA virtual account fee is $10.' });

  if (!providerConfigured()) {
    const product = await ProductRequest.create({ user: req.user._id, productType, feeAmount, feeCurrency, firstName: req.body.firstName || req.user.fullName?.split(' ')[0], lastName: req.body.lastName || req.user.fullName?.split(' ').slice(1).join(' '), phone: req.body.phone, country: isUsa ? 'USA' : 'Nigeria', status: 'pending_configuration', providerMessage: 'Banking service setup is not available yet.' });
    return res.status(202).json({ message: `${productType} request saved. Live API is not configured yet, so no account number was generated.`, productRequest: product });
  }

  const providerResult = await submitToStrowallet({ productType, ...req.body, customerEmail: req.user.email, customerName: req.user.fullName, country: isUsa ? 'USA' : 'Nigeria' });
  if (providerResult.status === 'failed') return res.status(502).json({ message: providerResult.message || 'Provider account request failed.' });
  if (isUsa) wallet.usdBalance -= 10;
  await wallet.save();
  const product = await ProductRequest.create({ user: req.user._id, productType, feeAmount, feeCurrency, firstName: req.body.firstName, lastName: req.body.lastName, phone: req.body.phone, country: isUsa ? 'USA' : 'Nigeria', status: providerResult.status || 'submitted_to_provider', providerReference: providerResult.reference, providerStatus: providerResult.status, providerMessage: providerResult.message, providerResponse: providerResult.response });
  if (isUsa) await recordTransaction({ user: req.user._id, productRequest: product._id, type: 'usa_virtual_account_fee', amount: 10, currency: 'USD', direction: 'debit', wallet: 'user', description: 'USA virtual account creation fee', status: 'completed' });
  res.status(201).json({ message: `${productType} request submitted. Account details will appear after provider confirmation.`, productRequest: product });
}));

router.post('/cards/request', protect, authorize('user'), asyncHandler(async (req, res) => {
  const { cardType, cardNetwork, pin } = req.body;
  if (!cardType) return res.status(400).json({ message: 'Card type is required.' });
  const pinCheck = await verifyPin(req.user._id, pin);
  if (!pinCheck.ok) return res.status(400).json({ message: pinCheck.message });
  const productType = /dollar|usd/i.test(cardType) ? 'USA Virtual Card' : (/physical/i.test(cardType) ? 'Naira Physical Card' : 'Nigeria Virtual Card');
  let providerResult = { status: 'pending_configuration', message: 'Banking service setup is not available yet.' };
  if (providerConfigured()) providerResult = await submitToStrowallet({ productType, ...req.body, customerEmail: req.user.email, customerName: req.user.fullName });
  if (providerResult.status === 'failed') return res.status(502).json({ message: providerResult.message || 'Provider card request failed.' });
  const product = await ProductRequest.create({ user: req.user._id, productType, feeAmount: 0, feeCurrency: 'NGN', firstName: req.body.firstName, lastName: req.body.lastName, phone: req.body.phone, country: req.body.country || 'Nigeria', status: providerResult.status || 'pending', providerReference: providerResult.reference, providerStatus: providerResult.status, providerMessage: providerResult.message, providerResponse: { cardType, cardNetwork, provider: providerResult.response } });
  res.status(201).json({ message: 'Card request saved. Final card status depends on provider/admin confirmation.', productRequest: product });
}));

router.post('/bills/:service', protect, authorize('user'), asyncHandler(async (req, res) => {
  const service = String(req.params.service || '').toLowerCase();
  const value = Number(req.body.amount || 0);
  if (!['airtime', 'data', 'cable', 'electricity', 'education', 'recharge-card'].includes(service)) return res.status(400).json({ message: 'Unsupported bill payment service.' });
  if ((service === 'airtime' || service === 'electricity') && value <= 0) return res.status(400).json({ message: 'A valid amount is required.' });
  const pinCheck = await verifyPin(req.user._id, req.body.pin);
  if (!pinCheck.ok) return res.status(400).json({ message: pinCheck.message });
  if (!providerConfigured()) return res.status(503).json({ message: 'Bill payment service is currently unavailable. Please check back shortly.' });
  const wallet = await ensureWallet(req.user._id);
  if (value > 0 && wallet.ngnBalance < value) return res.status(400).json({ message: 'Insufficient NGN wallet balance.' });
  const productType = service === 'data' ? 'Data Subscription' : service === 'airtime' ? 'Airtime Top-up' : 'Bill Payments';
  const providerResult = await submitToStrowallet({ productType, ...req.body, customerEmail: req.user.email, customerName: req.user.fullName });
  if (providerResult.status === 'failed') return res.status(502).json({ message: providerResult.message || 'Provider bill payment failed.' });
  if (value > 0) { wallet.ngnBalance -= value; await wallet.save(); }
  const reference = providerResult.reference || ref('SPW-BILL');
  await recordTransaction({ user: req.user._id, type: `bill_${service}`, amount: value || 0, currency: 'NGN', direction: 'debit', wallet: 'user', description: `${service} payment request`, status: 'pending', meta: { reference, providerStatus: providerResult.status } });
  res.json({ message: 'Bill payment request submitted. Final status depends on provider confirmation.', reference });
}));

router.get('/support/tickets', protect, authorize('user'), asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ tickets });
}));

router.post('/support/tickets', protect, authorize('user'), asyncHandler(async (req, res) => {
  const { subject, category, priority, message, attachmentName } = req.body;
  if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required.' });
  const ticket = await SupportTicket.create({ user: req.user._id, subject, category, priority, message, attachmentName });
  res.status(201).json({ message: 'Support ticket created.', ticket });
}));

router.get('/admin/overview', protect, authorize('admin', 'owner'), asyncHandler(async (_req, res) => {
  const [transactions, productRequests, tickets, systemWallet] = await Promise.all([
    Transaction.find({}).populate('user', 'fullName email').sort({ createdAt: -1 }).limit(100),
    ProductRequest.find({}).populate('user', 'fullName email').sort({ createdAt: -1 }).limit(100),
    SupportTicket.find({}).populate('user', 'fullName email').sort({ createdAt: -1 }).limit(100),
    SystemWallet.findOne({ name: 'admin_wallet' })
  ]);
  res.json({ transactions, productRequests, tickets, systemWallet });
}));

router.use((err, _req, res, _next) => {
  console.error('Banking route error:', err);
  res.status(500).json({ message: err.message || 'Banking service error' });
});

module.exports = router;
