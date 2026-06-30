const mongoose = require('mongoose');
const clientPaymentSchema = new mongoose.Schema({
  clientName: String, clientEmail: String, projectTitle: String, paymentType: { type: String, enum: ['advance','full','milestone'], default: 'advance' },
  amount: { type: Number, default: 0 }, currency: { type: String, default: 'USD' }, paystackReference: String, status: { type: String, default: 'pending' },
  paystackFee: { type: Number, default: 0 }, settledAmount: { type: Number, default: 0 }, notes: String
}, { timestamps: true });
module.exports = mongoose.model('ClientPayment', clientPaymentSchema);
