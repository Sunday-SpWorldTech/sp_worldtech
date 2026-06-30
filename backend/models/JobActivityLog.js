const mongoose = require('mongoose');

const jobActivityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  action: { type: String, required: true },
  message: { type: String, default: '' },
  meta: { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('JobActivityLog', jobActivityLogSchema);
