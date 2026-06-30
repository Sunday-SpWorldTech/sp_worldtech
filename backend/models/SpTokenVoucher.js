const mongoose = require('mongoose');

const spTokenVoucherSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, enum: ['NGN', 'USD'], default: 'NGN' },
  purpose: { type: String, enum: ['deposit', 'withdrawal', 'job_payout'], default: 'deposit', index: true },
  feePercent: { type: Number, default: 3 },
  feeAmount: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  codeHash: { type: String, unique: true, sparse: true, index: true },
  codeMasked: { type: String, default: '' },
  // For admin-issued job payout vouchers, the user needs the full claim code to redeem.
  // Payment/deposit vouchers are still revealed only once at Paystack verification.
  claimCode: { type: String, default: '', select: false },
  paystackReference: { type: String, unique: true, sparse: true, index: true },
  paystackStatus: { type: String, default: 'pending' },
  status: { type: String, enum: ['pending_payment', 'active', 'redeemed', 'cancelled'], default: 'pending_payment', index: true },
  redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  redeemedAt: Date,
  bankDetails: mongoose.Schema.Types.Mixed,
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('SpTokenVoucher', spTokenVoucherSchema);
