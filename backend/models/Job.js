const mongoose = require('mongoose');

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

const jobSchema = new mongoose.Schema({
  title: String,
  description: String,
  shortDescription: String,
  responsibilities: [String],
  requirements: [String],
  skills: [String],
  benefits: [String],
  category: String,
  company: { type: String, default: 'SP WorldTech Client' },
  companyLogo: String,
  companyInfo: String,
  clientEmail: String,
  clientContact: String,
  location: { type: String, default: 'Remote' },
  country: String,
  workMode: { type: String, enum: ['Remote', 'Hybrid', 'On-site', 'Flexible'], default: 'Remote' },
  employmentType: { type: String, default: 'Full-time' },
  experienceLevel: { type: String, default: 'Not specified' },
  applyLink: String,
  externalId: String,
  salary: String,
  salaryAmount: Number,
  fullAmount: Number,
  userVisibleAmount: Number,
  adminAmount: Number,
  userPercent: { type: Number, default: 40 },
  adminPercent: { type: Number, default: 60 },
  transactionChargePercent: { type: Number, default: 2 },
  transactionChargeAmount: { type: Number, default: 0 },
  dueDate: Date,
  postedAt: Date,
  closingDate: Date,
  source: { type: String, default: 'company_api' },
  status: { type: String, default: 'open' }
}, { timestamps: true });

jobSchema.index({ externalId: 1, source: 1 }, { unique: true, sparse: true });
jobSchema.index({ title: 'text', company: 'text', description: 'text', skills: 'text', location: 'text', country: 'text' });

jobSchema.pre('save', function calculateSplits(next) {
  const full = Number(this.fullAmount || 0);
  this.userVisibleAmount = roundMoney(full * 0.40);
  this.adminAmount = roundMoney(full * 0.60);
  this.transactionChargeAmount = roundMoney(full * (Number(this.transactionChargePercent || 0) / 100));
  next();
});

module.exports = mongoose.model('Job', jobSchema);
