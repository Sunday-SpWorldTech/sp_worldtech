const mongoose = require('mongoose');

const productRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productType: {
    type: String,
    enum: [
      'Nigeria Virtual Bank Account',
      'USA Virtual Bank Account',
      'Nigeria Virtual Card',
      'USA Virtual Card',
      'Naira Physical Card',
      'Airtime Top-up',
      'Data Subscription',
      'Fund Transfer',
      'Bill Payments',
      'My Subscription',
      'Business Operations',
      'My Merchants',
      'Virtual Accounts',
      'Support Ticket'
    ],
    required: true
  },
  provider: { type: String, default: 'strowallet' },
  feeAmount: { type: Number, default: 0 },
  feeCurrency: { type: String, default: 'NGN' },
  firstName: String,
  lastName: String,
  phone: String,
  dateOfBirth: String,
  country: String,
  state: String,
  city: String,
  address: String,
  postalCode: String,
  identityType: String,
  identityNumberLast4: String,
  network: String,
  dataPlan: String,
  billPhone: String,
  status: {
    type: String,
    enum: ['pending', 'pending_configuration', 'pending_provider_endpoint', 'submitted_to_provider', 'approved', 'rejected', 'failed'],
    default: 'pending'
  },
  providerReference: String,
  providerStatus: String,
  providerMessage: String,
  providerResponse: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('ProductRequest', productRequestSchema);
