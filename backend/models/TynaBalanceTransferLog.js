const mongoose = require('mongoose');

const tynaBalanceTransferLogSchema = new mongoose.Schema({
  connection: { type: mongoose.Schema.Types.ObjectId, ref: 'TynaTokenConnection' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tynaDeveloperId: { type: String, required: true },
  sourcePlatform: { type: String, default: 'Tyna Systems' },
  destinationPlatform: { type: String, default: 'SP WorldTech Admin Wallet' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  reference: { type: String, required: true, unique: true },
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  message: String
}, { timestamps: true });

module.exports = mongoose.model('TynaBalanceTransferLog', tynaBalanceTransferLogSchema);
