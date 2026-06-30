const mongoose = require('mongoose');

const tynaTokenConnectionSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tynaDeveloperId: { type: String, required: true, index: true },
  tokenCiphertext: { type: String, required: true },
  tokenIv: { type: String, required: true },
  tokenAuthTag: { type: String, required: true },
  tokenFingerprint: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active'], default: 'active' },
  lastBalanceChecked: { type: Number, default: 0 },
  lastForwardedAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' },
  lastVerifiedAt: Date,
  lastForwardedAt: Date,
  lastReference: String,
  note: String
}, { timestamps: true });

module.exports = mongoose.model('TynaTokenConnection', tynaTokenConnectionSchema);
