const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true },
  courseId: { type: String, required: true },
  courseTitle: { type: String, required: true },
  certificateId: { type: String, unique: true, required: true },
  issuedAt: { type: Date, default: Date.now },
  verificationUrl: String,
  status: { type: String, enum: ['active', 'revoked'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('Certificate', certificateSchema);
