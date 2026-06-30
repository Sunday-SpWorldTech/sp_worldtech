const mongoose = require('mongoose');

const cryptoTransactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'CryptoOrder' },
  type: { type: String, enum: ['deposit', 'buy', 'sell', 'withdrawal', 'fee', 'refund'], required: true },
  pair: String,
  asset: String,
  amount: Number,
  fee: Number,
  total: Number,
  reference: { type: String, index: true },
  provider: { type: String, enum: ['paystack', 'luno', 'spworldtech'], default: 'spworldtech' },
  providerId: String,
  status: { type: String, default: 'pending', index: true },
  detail: String,
  metadata: Object
}, { timestamps: true });

module.exports = mongoose.model('CryptoTransaction', cryptoTransactionSchema);
