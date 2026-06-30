const mongoose = require('mongoose');

const systemWalletSchema = new mongoose.Schema({
  name: { type: String, default: 'admin_wallet', unique: true },
  adminUsdBalance: { type: Number, default: 0 },
  adminNgnBalance: { type: Number, default: 0 },
  jobRevenueUsd: { type: Number, default: 0 },
  transactionChargesUsd: { type: Number, default: 0 },
  productFeeUsd: { type: Number, default: 0 },
  productFeeNgn: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('SystemWallet', systemWalletSchema);
