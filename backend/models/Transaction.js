const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  productRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductRequest' },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  direction: { type: String, enum: ['credit', 'debit'], default: 'credit' },
  wallet: { type: String, enum: ['user', 'admin', 'system'], default: 'system' },
  description: String,
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  meta: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
