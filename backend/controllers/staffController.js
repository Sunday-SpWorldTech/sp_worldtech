const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Withdrawal = require('../models/Withdrawal');
const Message = require('../models/Message');
const Wallet = require('../models/Wallet');
const ProductRequest = require('../models/ProductRequest');
const SystemWallet = require('../models/SystemWallet');
const Transaction = require('../models/Transaction');
const ClientContact = require('../models/ClientContact');
const AIMessage = require('../models/AIMessage');
const JobActivityLog = require('../models/JobActivityLog');
const JobNotification = require('../models/JobNotification');
const SpTokenVoucher = require('../models/SpTokenVoucher');
const GiftCardOrder = require('../models/GiftCardOrder');
const crypto = require('crypto');
const { ensureJobs } = require('../services/jobService');

let lastAdminJobWarmupAt = 0;
function warmJobsForAdminDashboard() {
  const now = Date.now();
  if (now - lastAdminJobWarmupAt < 5 * 60 * 1000) return;
  lastAdminJobWarmupAt = now;
  ensureJobs().catch((error) => console.warn('Admin background job warmup skipped:', error.message));
}


function hashSpToken(code) {
  return crypto.createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');
}

function makeSpTokenCode(prefix = 'SP-JOB') {
  const raw = crypto.randomBytes(12).toString('hex').toUpperCase();
  return `${prefix}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}`;
}

function maskSpToken(code = '') {
  return code ? `${code.slice(0, 7)}••••••••${code.slice(-5)}` : '';
}

async function ensureSystemWallet() {
  let wallet = await SystemWallet.findOne({ name: 'admin_wallet' });
  if (!wallet) wallet = await SystemWallet.create({ name: 'admin_wallet' });
  return wallet;
}

function isAdminRole(role) {
  return ['admin', 'owner'].includes(role);
}

function safeJobForSupport(job) {
  const safe = typeof job.toObject === 'function' ? job.toObject() : { ...job };
  delete safe.fullAmount;
  delete safe.adminAmount;
  delete safe.transactionChargeAmount;
  delete safe.transactionChargePercent;
  return safe;
}

function safeApplicationForSupport(item) {
  const safe = typeof item.toObject === 'function' ? item.toObject() : { ...item };
  delete safe.fullAmount;
  delete safe.adminAmount;
  delete safe.transactionChargeAmount;
  delete safe.transactionChargePercent;
  if (safe.job) safe.job = safeJobForSupport(safe.job);
  return safe;
}

function safeProductRequestForSupport(item) {
  const safe = typeof item.toObject === 'function' ? item.toObject() : { ...item };
  delete safe.feeAmount;
  delete safe.feeCurrency;
  delete safe.providerResponse;
  delete safe.identityNumber;
  return safe;
}

exports.getDashboard = async (req, res) => {
  warmJobsForAdminDashboard();
  const systemWallet = await ensureSystemWallet();

  const [
    users,
    totalJobs,
    jobs,
    applications,
    withdrawals,
    messages,
    walletTotals,
    pendingWithdrawals,
    productRequests,
    transactions,
    clientContacts,
    aiMessages,
    jobActivityLogs,
    jobNotifications,
    giftCardOrders
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Job.countDocuments(),
    Job.find().sort({ createdAt: -1 }).limit(20),
    Application.find().populate('user').populate('job').sort({ createdAt: -1 }).limit(20),
    Withdrawal.find().populate('user').sort({ createdAt: -1 }).limit(20),
    Message.find().sort({ createdAt: 1 }).limit(50),
    Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalUsdBalance: { $sum: '$usdBalance' },
          totalNgnBalance: { $sum: '$ngnBalance' },
          totalVisibleEarnings: { $sum: '$visibleEarnings' }
        }
      }
    ]),
    Withdrawal.countDocuments({ status: 'pending' }),
    ProductRequest.find().populate('user').sort({ createdAt: -1 }).limit(20),
    Transaction.find().populate('user').sort({ createdAt: -1 }).limit(20),
    ClientContact.find().populate('application').populate('job').sort({ updatedAt: -1 }).limit(50),
    AIMessage.find().populate('application').populate('job').sort({ createdAt: -1 }).limit(50),
    JobActivityLog.find().populate('user').populate('application').populate('job').sort({ createdAt: -1 }).limit(50),
    JobNotification.find({ role: { $in: ['admin', 'owner'] } }).populate('application').populate('job').sort({ createdAt: -1 }).limit(50),
    GiftCardOrder.find().populate('user', 'fullName email phone').sort({ createdAt: -1 }).limit(50)
  ]);

  const walletSummary = walletTotals[0] || {
    totalUsdBalance: 0,
    totalNgnBalance: 0,
    totalVisibleEarnings: 0
  };

  const isAdmin = isAdminRole(req.user.role);
  res.json({
    stats: {
      users,
      jobs: totalJobs,
      applications: applications.length,
      pendingWithdrawals: isAdmin ? pendingWithdrawals : 0,
      productRequests: productRequests.length,
      giftCardOrders: giftCardOrders.length,
      transactions: isAdmin ? transactions.length : 0
    },
    walletSummary: isAdmin ? walletSummary : undefined,
    systemWallet: isAdmin ? systemWallet : undefined,
    jobs: isAdmin ? jobs : jobs.map(safeJobForSupport),
    applications: isAdmin ? applications : applications.map(safeApplicationForSupport),
    withdrawals: isAdmin ? withdrawals : [],
    productRequests: isAdmin ? productRequests : productRequests.map(safeProductRequestForSupport),
    giftCardOrders: ['admin', 'owner', 'staff'].includes(req.user.role) ? giftCardOrders : [],
    transactions: isAdmin ? transactions : [],
    messages,
    clientContacts: isAdmin ? clientContacts : [],
    aiMessages: isAdmin ? aiMessages : [],
    jobActivityLogs: isAdmin ? jobActivityLogs : [],
    jobNotifications: isAdmin ? jobNotifications : [],
    role: req.user.role
  });
};


exports.getPlatformSettings = async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ message: 'Owner / Super Admin access only' });
  res.json({
    role: req.user.role,
    integrations: {
      mongodb: Boolean(process.env.MONGODB_URI),
      openWebNinja: Boolean(process.env.JSEARCH_API_KEY),
      strowallet: Boolean((process.env.STROWALLET_PUBLIC_KEY || process.env.STROWALLET_API_KEY) && process.env.STROWALLET_SECRET_KEY),
      paystack: Boolean(process.env.PAYSTACK_SECRET_KEY && !String(process.env.PAYSTACK_SECRET_KEY).includes('replace')),
      aiMessageGenerator: true
    },
    jobSource: 'SP WorldTech recruitment portal → Jobs page/dashboard → Worker applies',
    rolePolicy: {
      worker: 'Sees only approved SP Token voucher payout amount and wallet balance',
      admin: 'Sees full client payment records, internal payout totals, and platform revenue',
      staff: 'Support only; no wallet, payment, revenue, or environment access',
      owner: 'Admin permissions plus API/env/platform settings'
    }
  });
};

exports.approveApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('user').populate('job');
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (application.payoutVoucher) return res.status(400).json({ message: 'SP Token job payout voucher has already been issued for this application.' });
    if (!['Under Review', 'under_review', 'Submitted', 'applied'].includes(application.status)) return res.status(400).json({ message: 'Only submitted or under-review applications can be accepted' });

    const systemWallet = await ensureSystemWallet();
    const payoutAmount = Number(application.userVisibleAmount || 0);
    if (!payoutAmount || payoutAmount <= 0) return res.status(400).json({ message: 'This application has no payable user amount.' });

    const tokenCode = makeSpTokenCode('SP-JOB');
    const spToken = await SpTokenVoucher.create({
      user: application.user._id,
      amount: payoutAmount,
      currency: 'USD',
      purpose: 'job_payout',
      codeHash: hashSpToken(tokenCode),
      codeMasked: maskSpToken(tokenCode),
      claimCode: tokenCode,
      status: 'active',
      application: application._id,
      issuedBy: req.user._id,
      metadata: {
        source: 'admin_paid_job_payout',
        flow: 'admin_accepts_job_to_sp_token_voucher_to_user_wallet_balance',
        jobId: application.job?._id,
        jobTitle: application.job?.title,
        fullAmount: application.fullAmount,
        payoutPolicy: 'internal_admin_only'
      }
    });

    systemWallet.adminUsdBalance += Number(application.adminAmount || 0) + Number(application.transactionChargeAmount || 0);
    systemWallet.jobRevenueUsd += Number(application.adminAmount || 0);
    systemWallet.transactionChargesUsd += Number(application.transactionChargeAmount || 0);
    await systemWallet.save();

    application.status = 'Accepted';
    application.statusHistory.push({ status: 'Accepted', note: 'Admin accepted application and issued SP Token job payout voucher. User must redeem token into wallet balance before withdrawal.', changedBy: req.user._id });
    application.approvedAt = new Date();
    application.payoutVoucher = spToken._id;
    application.payoutVoucherStatus = 'issued';
    application.payoutVoucherIssuedAt = new Date();
    await application.save();

    await Transaction.insertMany([
      {
        user: application.user._id,
        application: application._id,
        type: 'job_user_sp_token_voucher_issued',
        amount: payoutAmount,
        currency: 'USD',
        direction: 'credit',
        wallet: 'user',
        description: `SP Token job payout voucher issued for ${application.job.title}`,
        meta: { spTokenId: spToken._id, tokenMasked: spToken.codeMasked, payoutPolicy: 'admin_internal_only' }
      },
      {
        user: application.user._id,
        application: application._id,
        type: 'admin_job_revenue_60_percent',
        amount: application.adminAmount,
        currency: 'USD',
        direction: 'credit',
        wallet: 'admin',
        description: `Admin job revenue recorded for ${application.job.title}`,
        meta: { fullAmount: application.fullAmount, payoutPolicy: 'admin_internal_only' }
      },
      {
        user: application.user._id,
        application: application._id,
        type: 'transaction_charge',
        amount: application.transactionChargeAmount,
        currency: 'USD',
        direction: 'credit',
        wallet: 'admin',
        description: `Transaction charge for ${application.job.title}`,
        meta: { chargePercent: application.transactionChargePercent, fullAmount: application.fullAmount }
      }
    ]);

    await JobActivityLog.create({ user: req.user._id, application: application._id, job: application.job._id, action: 'SP Token Job Payout Issued', message: `Admin accepted the application and issued ${spToken.codeMasked} for user redemption.` });
    await JobNotification.create({ user: application.user._id, role: 'user', title: 'SP Token job payout ready', message: `Your application for ${application.job.title} was accepted. Redeem your SP Token voucher in Wallet to credit your balance, then withdraw when ready.`, application: application._id, job: application.job._id }).catch(() => null);
    res.json({
      message: 'Application accepted. SP Token job payout voucher issued. User must redeem the voucher into wallet balance before withdrawal.',
      spToken: { code: tokenCode, codeMasked: spToken.codeMasked, amount: spToken.amount, currency: spToken.currency, purpose: spToken.purpose, status: spToken.status }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ message: 'Application not found' });
    application.status = 'Rejected';
    application.statusHistory.push({ status: 'Rejected', note: 'Admin rejected the application.', changedBy: req.user._id });
    await application.save();
    await JobActivityLog.create({ user: req.user._id, application: application._id, job: application.job, action: 'Application Rejected', message: 'Admin rejected the application.' }).catch(() => null);
    await JobNotification.create({ user: application.user, role: 'user', title: 'Application rejected', message: 'Your application was rejected after SP WorldTech review.', application: application._id, job: application.job }).catch(() => null);
    res.json({ message: 'Application rejected.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.updateApplicationStatus = async (req, res) => {
  try {
    const allowed = ['Submitted', 'Under Review', 'Contacting Client', 'Client Responded', 'Interview', 'Accepted', 'Rejected', 'Closed'];
    const { status, note } = req.body;
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid application status.' });
    const application = await Application.findById(req.params.id).populate('user').populate('job');
    if (!application) return res.status(404).json({ message: 'Application not found' });
    application.status = status;
    application.statusHistory.push({ status, note: note || `Status changed to ${status}`, changedBy: req.user._id });
    await application.save();
    await JobActivityLog.create({ user: req.user._id, application: application._id, job: application.job?._id, action: 'Application Status Changed', message: note || `Application status changed to ${status}.` });
    await JobNotification.create({ user: application.user?._id, role: 'user', title: 'Application status updated', message: `Your application for ${application.job?.title || 'a job'} is now: ${status}.`, application: application._id, job: application.job?._id }).catch(() => null);
    res.json({ message: 'Application status updated.', application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ message: 'Only pending withdrawals can be approved' });

    withdrawal.status = 'approved';
    await withdrawal.save();

    await Transaction.create({
      user: withdrawal.user._id,
      type: 'user_withdrawal_approved',
      amount: withdrawal.amount,
      currency: withdrawal.currency || 'USD',
      direction: 'debit',
      wallet: 'user',
      description: `Withdrawal approved through ${withdrawal.channel}`,
      meta: { channel: withdrawal.channel }
    });

    res.json({ message: 'Withdrawal approved. Complete the approved bank payout through your secure payout process.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user');
    if (!withdrawal) return res.status(404).json({ message: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ message: 'Only pending withdrawals can be rejected' });

    const userWallet = await Wallet.findOne({ user: withdrawal.user._id }) || await Wallet.create({ user: withdrawal.user._id });
    const refundCurrency = String(withdrawal.currency || 'USD').toUpperCase() === 'NGN' ? 'NGN' : 'USD';
    const balanceField = refundCurrency === 'NGN' ? 'ngnBalance' : 'usdBalance';
    userWallet[balanceField] = Number(userWallet[balanceField] || 0) + Number(withdrawal.amount || 0);
    await userWallet.save();

    withdrawal.status = 'rejected';
    await withdrawal.save();

    await Transaction.create({
      user: withdrawal.user._id,
      type: 'user_withdrawal_rejected_balance_refund',
      amount: withdrawal.amount,
      currency: refundCurrency,
      direction: 'credit',
      wallet: 'user',
      description: `Withdrawal rejected and wallet balance restored`,
      meta: { channel: withdrawal.channel }
    });

    res.json({ message: 'Withdrawal rejected and wallet balance restored.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
