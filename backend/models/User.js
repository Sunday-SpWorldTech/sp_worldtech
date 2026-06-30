const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: '' },
  accountType: { type: String, enum: ['general_user', 'job_worker', 'academy_student', 'banking_crypto_client'], default: 'general_user' },
  password: { type: String },
  accessPinHash: { type: String, default: null, select: false },
  operationsPinHash: { type: String, default: null, select: false },
  operationsTokenId: { type: String, default: null, unique: true, sparse: true },
  role: { type: String, enum: ['user', 'admin', 'staff', 'owner'], default: 'user' },
  googleId: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
