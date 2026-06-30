const mongoose = require('mongoose');

const adminAIDraftSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' },
  draftType: { type: String, default: 'general' },
  recipientType: { type: String, enum: ['client', 'api_team', 'user', 'support', 'internal'], default: 'internal' },
  subject: { type: String, default: '' },
  message: { type: String, required: true },
  status: { type: String, enum: ['Draft', 'Approved', 'Sent Manually', 'Rejected', 'Archived'], default: 'Draft' }
}, { timestamps: true });

module.exports = mongoose.model('AdminAIDraft', adminAIDraftSchema);
