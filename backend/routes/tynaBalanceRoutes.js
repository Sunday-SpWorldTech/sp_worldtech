const router = require('express').Router();
const crypto = require('crypto');
const { protect, authorize } = require('../middleware/auth');
const SystemWallet = require('../models/SystemWallet');
const Transaction = require('../models/Transaction');
const TynaTokenConnection = require('../models/TynaTokenConnection');
const TynaBalanceTransferLog = require('../models/TynaBalanceTransferLog');

function isAdminUser(user) {
  return ['admin', 'owner'].includes(user?.role);
}

function requireAdmin(req, res, next) {
  if (!isAdminUser(req.user)) return res.status(403).json({ message: 'Admin or Owner access required.' });
  next();
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('Tyna balance route error:', error.message);
    res.status(500).json({ message: error.message || 'Tyna balance request failed.' });
  });
}

function getEncryptionKey() {
  const secret = process.env.SPWORLDTECH_TYNA_TOKEN_ENCRYPTION_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 24) throw new Error('SPWORLDTECH_TYNA_TOKEN_ENCRYPTION_SECRET is missing or too short. Add it in Render environment variables.');
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    tokenCiphertext: ciphertext.toString('base64'),
    tokenIv: iv.toString('base64'),
    tokenAuthTag: authTag.toString('base64')
  };
}

function decryptToken(connection) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(connection.tokenIv, 'base64'));
  decipher.setAuthTag(Buffer.from(connection.tokenAuthTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(connection.tokenCiphertext, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

function fingerprint(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeCurrency(currency) {
  return String(currency || 'NGN').toUpperCase();
}

async function callTyna(url, token, amount) {
  if (!url) throw new Error('Tyna Systems endpoint is not configured.');
  if (!process.env.TYNA_INTERNAL_API_KEY) throw new Error('TYNA_INTERNAL_API_KEY is missing in SP WorldTech environment variables.');
  const body = amount === undefined ? { token } : { token, amount };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-api-key': process.env.TYNA_INTERNAL_API_KEY
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (_error) { data = { message: text || response.statusText }; }
  if (!response.ok || data.success === false) throw new Error(data.message || 'Tyna Systems request failed.');
  return data;
}

async function ensureAdminWallet() {
  let wallet = await SystemWallet.findOne({ name: 'admin_wallet' });
  if (!wallet) wallet = await SystemWallet.create({ name: 'admin_wallet' });
  return wallet;
}

async function creditSpAdminWallet({ amount, currency, reference, requestedBy, tynaDeveloperId, connection }) {
  const normalizedCurrency = normalizeCurrency(currency);
  const wallet = await ensureAdminWallet();
  if (normalizedCurrency === 'USD') wallet.adminUsdBalance += amount;
  else wallet.adminNgnBalance += amount;
  await wallet.save();

  await Transaction.create({
    user: requestedBy,
    type: 'tyna_system_balance_auto_forward',
    amount,
    currency: normalizedCurrency,
    direction: 'credit',
    wallet: 'admin',
    description: 'Tyna Systems verified balance auto-forwarded to SP WorldTech admin wallet.',
    status: 'completed',
    meta: { sourcePlatform: 'Tyna Systems', reference, tynaDeveloperId }
  });

  await TynaBalanceTransferLog.create({
    connection: connection._id,
    requestedBy,
    tynaDeveloperId,
    amount,
    currency: normalizedCurrency,
    reference,
    status: 'success',
    message: 'Verified Tyna Systems balance credited to SP WorldTech admin wallet.'
  });

  return wallet;
}

async function forwardConnectionBalance(connection, requestedBy) {
  const token = decryptToken(connection);
  const verifyData = await callTyna(process.env.TYNA_VERIFY_URL, token);
  const availableBalance = Number(verifyData.balance || 0);
  const currency = normalizeCurrency(verifyData.currency || connection.currency || 'NGN');

  connection.lastBalanceChecked = availableBalance;
  connection.currency = currency;
  connection.lastVerifiedAt = new Date();

  if (availableBalance <= 0) {
    await connection.save();
    return { forwarded: false, amount: 0, currency, message: 'No Tyna Systems balance available to forward.' };
  }

  const transferData = await callTyna(process.env.TYNA_TRANSFER_URL, token, availableBalance);
  const amount = Number(transferData.amount || availableBalance);
  const reference = transferData.reference || `TYNA-SPW-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const transferCurrency = normalizeCurrency(transferData.currency || currency);
  const adminWallet = await creditSpAdminWallet({ amount, currency: transferCurrency, reference, requestedBy, tynaDeveloperId: connection.tynaDeveloperId, connection });

  connection.lastBalanceChecked = 0;
  connection.lastForwardedAmount = amount;
  connection.currency = transferCurrency;
  connection.lastForwardedAt = new Date();
  connection.lastReference = reference;
  await connection.save();

  return { forwarded: true, amount, currency: transferCurrency, reference, adminWallet };
}

router.get('/status', protect, requireAdmin, asyncHandler(async (req, res) => {
  const connection = await TynaTokenConnection.findOne({ createdBy: req.user._id }).sort({ updatedAt: -1 });
  if (connection && connection.status !== 'active') {
    connection.status = 'active';
    connection.note = 'Lifetime token connection kept active by SP WorldTech.';
    await connection.save();
  }
  const recentTransfers = await TynaBalanceTransferLog.find({ requestedBy: req.user._id }).sort({ createdAt: -1 }).limit(10).lean();
  res.json({
    connected: Boolean(connection),
    connection: connection ? {
      id: connection._id,
      tynaDeveloperId: connection.tynaDeveloperId,
      status: connection.status,
      lastBalanceChecked: connection.lastBalanceChecked,
      lastForwardedAmount: connection.lastForwardedAmount,
      currency: connection.currency,
      lastVerifiedAt: connection.lastVerifiedAt,
      lastForwardedAt: connection.lastForwardedAt,
      lastReference: connection.lastReference
    } : null,
    recentTransfers
  });
}));

router.post('/connect-token', protect, requireAdmin, asyncHandler(async (req, res) => {
  const token = String(req.body.token || '').trim();
  if (!token) return res.status(400).json({ message: 'Tyna Systems token is required.' });

  const verifyData = await callTyna(process.env.TYNA_VERIFY_URL, token);
  const fp = fingerprint(token);
  const encrypted = encryptToken(token);
  const connection = await TynaTokenConnection.findOneAndUpdate(
    { tokenFingerprint: fp },
    {
      createdBy: req.user._id,
      tynaDeveloperId: String(verifyData.developerId || verifyData.tynaDeveloperId || 'unknown'),
      ...encrypted,
      status: 'active',
      lastBalanceChecked: Number(verifyData.balance || 0),
      currency: normalizeCurrency(verifyData.currency || 'NGN'),
      lastVerifiedAt: new Date(),
      note: 'Connected from SP WorldTech admin/owner dashboard.'
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  let autoForward = null;
  if (Number(verifyData.balance || 0) > 0) {
    autoForward = await forwardConnectionBalance(connection, req.user._id);
  }

  res.json({
    message: autoForward?.forwarded ? 'Token connected and available Tyna Systems balance was auto-forwarded.' : 'Token connected. No balance was available to forward.',
    connection: {
      id: connection._id,
      tynaDeveloperId: connection.tynaDeveloperId,
      lastBalanceChecked: connection.lastBalanceChecked,
      currency: connection.currency,
      status: connection.status
    },
    autoForward
  });
}));

router.post('/auto-forward', protect, requireAdmin, asyncHandler(async (req, res) => {
  const connection = await TynaTokenConnection.findOne({ createdBy: req.user._id }).sort({ updatedAt: -1 });
  if (!connection) return res.status(404).json({ message: 'No active Tyna Systems token connection found.' });
  if (connection.status !== 'active') {
    connection.status = 'active';
    connection.note = 'Lifetime token connection kept active by SP WorldTech.';
    await connection.save();
  }
  const result = await forwardConnectionBalance(connection, req.user._id);
  res.json({ message: result.forwarded ? 'Balance auto-forwarded to SP WorldTech admin wallet.' : result.message, result });
}));


router.post('/revoke', protect, requireAdmin, asyncHandler(async (req, res) => {
  const connection = await TynaTokenConnection.findOne({ createdBy: req.user._id }).sort({ updatedAt: -1 });
  if (connection && connection.status !== 'active') {
    connection.status = 'active';
    connection.note = 'Lifetime token connection kept active by SP WorldTech.';
    await connection.save();
  }
  return res.status(403).json({ message: 'Token disconnection is disabled. SP WorldTech lifetime token connections remain active.' });
}));

router.post('/revoke-token', protect, requireAdmin, asyncHandler(async (req, res) => {
  const connection = await TynaTokenConnection.findOne({ createdBy: req.user._id }).sort({ updatedAt: -1 });
  if (connection && connection.status !== 'active') {
    connection.status = 'active';
    connection.note = 'Lifetime token connection kept active by SP WorldTech.';
    await connection.save();
  }
  return res.status(403).json({ message: 'Token disconnection is disabled. SP WorldTech lifetime token connections remain active.' });
}));

module.exports = router;
