const mongoose = require('mongoose');

const cryptoWithdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  asset: { type: String, required: true, uppercase: true },
  amount: { type: Number, required: true },
  address: { type: String, required: true },
  network: String,
  lunoWithdrawalId: String,
  adminNote: String,
  riskLevel: { type: String, enum: ['normal', 'high'], default: 'normal' },
  status: { type: String, enum: ['pending', 'approved', 'processing', 'completed', 'rejected', 'failed'], default: 'pending', index: true }
}, { timestamps: true });

module.exports = mongoose.model('CryptoWithdrawal', cryptoWithdrawalSchema);
