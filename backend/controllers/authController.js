const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { normalizeRole } = require('../middleware/auth');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function signPinToken(id) {
  return jwt.sign({ id, purpose: 'user_pin_verify' }, process.env.JWT_SECRET, { expiresIn: '10m' });
}

async function ensureWallet(userId) {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) wallet = await Wallet.create({ user: userId });
  return wallet;
}

function authPayload(user) {
  return {
    token: signToken(user._id),
    user: {
      id: user._id,
      fullName: user.fullName,
      username: user.username || null,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      operationsTokenId: user.operationsTokenId || null
    }
  };
}

function validatePassword(password) { return String(password || '').length >= 8; }
function validatePin(pin) { return /^\d{4,8}$/.test(String(pin || '').trim()); }
function cleanUsername(username) { return String(username || '').toLowerCase().trim().replace(/[^a-z0-9._-]/g, ''); }
function cleanEmail(email) { return String(email || '').toLowerCase().trim(); }

async function createUserAccount(req, res) {
  try {
    const fullName = String(req.body.fullName || '').trim();
    const email = cleanEmail(req.body.email);
    const username = cleanUsername(req.body.username || email.split('@')[0]);
    const phone = String(req.body.phone || '').trim();
    const requestedAccountType = String(req.body.accountType || 'general_user').trim();
    const allowedAccountTypes = ['general_user', 'job_worker', 'academy_student', 'banking_crypto_client'];
    const accountType = allowedAccountTypes.includes(requestedAccountType) ? requestedAccountType : 'general_user';
    const password = String(req.body.password || '');
    const pin = String(req.body.pin || req.body.accessPin || '').trim();

    if (!fullName || fullName.length < 2) return res.status(400).json({ message: 'Enter your full name.' });
    if (!email || !email.includes('@')) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (!username || username.length < 3) return res.status(400).json({ message: 'Username must be at least 3 characters.' });
    if (!validatePassword(password)) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (!validatePin(pin)) return res.status(400).json({ message: 'Create a secure 4 to 8 digit PIN.' });

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ message: 'Email or username already exists.' });

    const user = await User.create({
      fullName,
      username,
      email,
      phone,
      accountType,
      password: await bcrypt.hash(password, 10),
      accessPinHash: await bcrypt.hash(pin, 10),
      role: 'user'
    });
    await ensureWallet(user._id);
    res.status(201).json({ ...authPayload(user), message: 'Account created successfully. Use username/password first, then your PIN for future login.' });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Email or username already exists.' });
    res.status(500).json({ message: error.message });
  }
}

exports.register = createUserAccount;
exports.userSignup = createUserAccount;

exports.userPasswordLogin = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.username || req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    if (!identifier || !password) return res.status(400).json({ message: 'Enter username/email and password.' });
    const user = await User.findOne({ role: 'user', $or: [{ email: identifier }, { username: identifier }] }).select('+password +accessPinHash');
    if (!user) return res.status(400).json({ message: 'Invalid user credentials.' });
    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) return res.status(400).json({ message: 'Invalid user credentials.' });
    if (!user.accessPinHash) return res.status(409).json({ message: 'PIN is not set for this account. Please create a new account or contact support.' });
    res.json({ requiresPin: true, pinToken: signPinToken(user._id), userPreview: { fullName: user.fullName, username: user.username, email: user.email }, message: 'Password verified. Enter your account PIN to continue.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.verifyUserPin = async (req, res) => {
  try {
    const pinToken = String(req.body.pinToken || '').trim();
    const pin = String(req.body.pin || '').trim();
    if (!pinToken || !validatePin(pin)) return res.status(400).json({ message: 'Enter the PIN sent from the login page.' });
    let decoded;
    try { decoded = jwt.verify(pinToken, process.env.JWT_SECRET); } catch (_error) { return res.status(401).json({ message: 'Login session expired. Please enter username and password again.' }); }
    if (decoded.purpose !== 'user_pin_verify') return res.status(401).json({ message: 'Invalid login session.' });
    const user = await User.findById(decoded.id).select('+accessPinHash');
    if (!user || user.role !== 'user' || !user.accessPinHash) return res.status(401).json({ message: 'Invalid user account or PIN is not configured.' });
    const valid = await bcrypt.compare(pin, user.accessPinHash);
    if (!valid) return res.status(400).json({ message: 'Invalid PIN.' });
    await ensureWallet(user._id);
    res.json({ ...authPayload(user), message: 'Login completed. Opening your dashboard.' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// Backward compatible one-step user login: password + pin required if used by old forms.
exports.login = async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.username || req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    const pin = String(req.body.pin || '').trim();
    const user = await User.findOne({ role: 'user', $or: [{ email: identifier }, { username: identifier }] }).select('+password +accessPinHash');
    if (!user) return res.status(400).json({ message: 'Invalid user credentials' });
    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) return res.status(400).json({ message: 'Invalid user credentials' });
    if (user.accessPinHash) {
      if (!validatePin(pin)) return res.status(202).json({ requiresPin: true, pinToken: signPinToken(user._id), message: 'Password verified. Enter PIN.' });
      const pinValid = await bcrypt.compare(pin, user.accessPinHash);
      if (!pinValid) return res.status(400).json({ message: 'Invalid PIN.' });
    }
    await ensureWallet(user._id);
    res.json(authPayload(user));
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.staffLogin = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const requestedRole = normalizeRole(role);
    if (!['staff', 'admin', 'owner'].includes(requestedRole)) {
      return res.status(400).json({ message: 'Choose Staff, Admin, or Owner / Super Admin.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const roleQuery = requestedRole === 'staff' ? ['staff', 'social_worker'] : [requestedRole];
    const user = await User.findOne({ email: normalizedEmail, role: { $in: roleQuery } });
    if (!user) return res.status(400).json({ message: 'Invalid operations credentials' });

    const valid = await bcrypt.compare(password, user.password || '');
    if (!valid) return res.status(400).json({ message: 'Invalid operations credentials' });

    if (user.role === 'social_worker') {
      user.role = 'staff';
      await user.save();
    }

    res.json(authPayload(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

function normalizePinAccessRole(role) {
  const normalized = normalizeRole(String(role || '').toLowerCase().trim());
  if (!['user', 'staff', 'admin', 'owner'].includes(normalized)) return null;
  return normalized;
}

function isProtectedOperationsRole(role) { return ['staff', 'admin', 'owner'].includes(role); }
function makeOperationsTokenId(role) { const prefix = role === 'owner' ? 'OWNER' : role.toUpperCase(); return `SP-${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; }
async function uniqueOperationsTokenId(role) { for (let attempt = 0; attempt < 8; attempt += 1) { const tokenId = makeOperationsTokenId(role); const existing = await User.findOne({ operationsTokenId: tokenId }); if (!existing) return tokenId; } throw new Error('Unable to generate a unique Token ID. Try again.'); }
function requireSetupCode(req, role) { const setupCode = process.env.OPERATIONS_SETUP_CODE; if (!setupCode) return true; const provided = String(req.body.setupCode || '').trim(); return provided === String(setupCode).trim(); }

exports.createOperationsPin = async (req, res) => {
  try {
    const role = normalizePinAccessRole(req.body.role);
    const fullName = String(req.body.fullName || '').trim();
    const pin = String(req.body.pin || '').trim();

    if (!role) return res.status(400).json({ message: 'Choose User, Staff, Admin, or Owner / Super Admin.' });
    if (!fullName || fullName.length < 2) return res.status(400).json({ message: 'Enter the access holder full name.' });
    if (!validatePin(pin)) return res.status(400).json({ message: 'PIN must be 4 to 8 digits.' });
    if (isProtectedOperationsRole(role) && !requireSetupCode(req, role)) return res.status(403).json({ message: 'Invalid operations setup code.' });

    const tokenId = await uniqueOperationsTokenId(role);
    const pinHash = await bcrypt.hash(pin, 10);
    const email = `${tokenId.toLowerCase()}@operations.spworldtech.local`;
    const user = await User.create({
      fullName,
      username: tokenId.toLowerCase(),
      email,
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      operationsPinHash: pinHash,
      operationsTokenId: tokenId,
      role
    });

    if (role === 'user') await ensureWallet(user._id);

    const payload = authPayload(user);
    res.status(201).json({
      ...payload,
      tokenId,
      message: role === 'user' ? 'User PIN created. Save the bold Token ID and PIN for future login.' : 'Operations PIN created. Save the bold Token ID and PIN for future login.'
    });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Token ID already exists. Try again.' });
    res.status(500).json({ message: error.message });
  }
};

exports.operationsPinLogin = async (req, res) => {
  try {
    const role = normalizePinAccessRole(req.body.role);
    const tokenId = String(req.body.tokenId || '').trim().toUpperCase();
    const pin = String(req.body.pin || '').trim();

    if (!role) return res.status(400).json({ message: 'Choose User, Staff, Admin, or Owner / Super Admin.' });
    if (!tokenId || !validatePin(pin)) return res.status(400).json({ message: 'Enter Token ID and 4 to 8 digit PIN.' });

    const user = await User.findOne({ operationsTokenId: tokenId, role }).select('+operationsPinHash');
    if (!user || !user.operationsPinHash) return res.status(400).json({ message: 'Invalid Token ID or PIN.' });

    const valid = await bcrypt.compare(pin, user.operationsPinHash);
    if (!valid) return res.status(400).json({ message: 'Invalid Token ID or PIN.' });
    if (role === 'user') await ensureWallet(user._id);

    res.json({ ...authPayload(user), tokenId, message: role === 'user' ? 'User calculator access granted.' : 'Operations calculator access granted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
