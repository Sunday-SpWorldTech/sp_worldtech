const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  usdBalance: { type: Number, default: 0 },
  ngnBalance: { type: Number, default: 0 },
  visibleEarnings: { type: Number, default: 0 },
  productRequests: [{
    productType: String,
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Wallet', walletSchema);
