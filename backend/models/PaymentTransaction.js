const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'CryptoOrder' },
  provider: { type: String, default: 'paystack' },
  reference: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  status: { type: String, default: 'pending', index: true },
  authorizationUrl: String,
  accessCode: String,
  channel: String,
  providerResponse: Object,
  verifiedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
