const mongoose = require('mongoose');

const cryptoWalletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  asset: { type: String, required: true, uppercase: true },
  available: { type: Number, default: 0 },
  locked: { type: Number, default: 0 },
  depositAddress: String,
  provider: { type: String, default: 'luno' },
  providerWalletId: String,
  lastSyncedAt: Date
}, { timestamps: true });

cryptoWalletSchema.index({ user: 1, asset: 1 }, { unique: true });
module.exports = mongoose.model('CryptoWallet', cryptoWalletSchema);
