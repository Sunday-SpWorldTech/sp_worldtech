const mongoose = require('mongoose');

const aiChatHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, enum: ['user', 'admin', 'staff', 'guest'], default: 'user' },
  context: { type: String, default: 'general' },
  provider: { type: String, default: 'copilot' },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  escalated: { type: Boolean, default: false },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' }
}, { timestamps: true });

module.exports = mongoose.model('AIChatHistory', aiChatHistorySchema);
