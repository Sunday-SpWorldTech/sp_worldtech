const mongoose = require('mongoose');

const studentAISessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, default: '' },
  topic: { type: String, default: '' },
  promptType: { type: String, enum: ['lesson', 'quiz', 'assignment', 'project', 'question', 'debugging'], default: 'question' },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  provider: { type: String, default: 'copilot' }
}, { timestamps: true });

module.exports = mongoose.model('StudentAISession', studentAISessionSchema);
