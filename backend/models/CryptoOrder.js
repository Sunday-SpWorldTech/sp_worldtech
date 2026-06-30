const mongoose = require('mongoose');

const cryptoOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  pair: { type: String, required: true, uppercase: true, index: true },
  baseAsset: String,
  quoteAsset: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  lunoMarketPrice: { type: Number, default: 0 },
  serviceFeePercent: { type: Number, default: 3 },
  serviceFee: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  estimatedCryptoAmount: { type: Number, default: 0 },
  paystackReference: { type: String, index: true },
  paystackStatus: { type: String, default: 'pending' },
  lunoOrderId: String,
  lunoResponse: Object,
  status: { type: String, enum: ['pending', 'pending_payment', 'paid', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending' },
  failureReason: String,
  kyc: Object
}, { timestamps: true });

module.exports = mongoose.model('CryptoOrder', cryptoOrderSchema);
