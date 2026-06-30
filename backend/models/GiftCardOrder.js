const mongoose = require('mongoose');

const giftCardOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, default: 'openwebninja_marketplace' },
  providerProductId: { type: String, required: true },
  productTitle: { type: String, default: '' },
  productUrl: { type: String, default: '' },
  image: { type: String, default: '' },
  brand: { type: String, required: true },
  country: { type: String, required: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'USD' },
  quantity: { type: Number, default: 1, min: 1 },
  totalAmount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], default: 'pending', index: true },
  deliveryEmail: String,
  providerReference: String,
  providerResponse: mongoose.Schema.Types.Mixed,
  fulfillmentNote: { type: String, default: '' },
  fulfillmentCodeMasked: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  refundedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('GiftCardOrder', giftCardOrderSchema);
