const mongoose = require('mongoose');

const jobNotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, enum: ['user', 'admin', 'staff', 'owner'], default: 'user' },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  read: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('JobNotification', jobNotificationSchema);
