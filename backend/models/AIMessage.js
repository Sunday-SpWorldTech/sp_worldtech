const mongoose = require('mongoose');

const aiMessageSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  clientContact: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientContact' },
  recipient: { type: String, default: '' },
  subject: { type: String, default: '' },
  message: { type: String, required: true },
  status: { type: String, enum: ['Generated', 'Edited', 'Sent Manually', 'Archived'], default: 'Generated' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('AIMessage', aiMessageSchema);
