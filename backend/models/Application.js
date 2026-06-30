const mongoose = require('mongoose');

const STATUS_VALUES = [
  'Submitted',
  'Under Review',
  'Contacting Client',
  'Client Responded',
  'Interview',
  'Accepted',
  'Rejected',
  'Closed',
  'applied',
  'under_review',
  'approved',
  'rejected',
  'refunded'
];

const applicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  status: {
    type: String,
    enum: STATUS_VALUES,
    default: 'Submitted'
  },
  resume: {
    filename: String,
    mimeType: String,
    size: Number,
    dataUrl: String
  },
  coverLetter: { type: String, default: '' },
  portfolioUrl: { type: String, default: '' },
  skills: [String],
  reviewNotes: { type: String, default: '' },
  statusHistory: [{
    status: String,
    note: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now }
  }],
  fullAmount: { type: Number, default: 0 },
  userVisibleAmount: { type: Number, default: 0 },
  adminAmount: { type: Number, default: 0 },
  userPercent: { type: Number, default: 40 },
  adminPercent: { type: Number, default: 60 },
  transactionChargePercent: { type: Number, default: 2 },
  transactionChargeAmount: { type: Number, default: 0 },
  submittedAt: Date,
  approvedAt: Date,
  paidAt: Date,
  payoutVoucher: { type: mongoose.Schema.Types.ObjectId, ref: 'SpTokenVoucher' },
  payoutVoucherStatus: { type: String, enum: ['not_issued', 'issued', 'redeemed'], default: 'not_issued' },
  payoutVoucherIssuedAt: Date
}, { timestamps: true });

applicationSchema.pre('save', function addInitialHistory(next) {
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory = [{ status: this.status || 'Submitted', note: 'Application submitted for SP WorldTech internal review.' }];
  }
  next();
});

module.exports = mongoose.model('Application', applicationSchema);
