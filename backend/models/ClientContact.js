const mongoose = require('mongoose');

const clientContactSchema = new mongoose.Schema({
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', index: true },
  clientName: { type: String, default: '' },
  company: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  contactInfo: { type: String, default: '' },
  contactDate: Date,
  status: {
    type: String,
    enum: ['Not Contacted', 'Contacted', 'Waiting for Reply', 'Interested', 'Not Interested', 'Interview Scheduled', 'Hiring in Progress', 'Closed'],
    default: 'Not Contacted'
  },
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('ClientContact', clientContactSchema);
