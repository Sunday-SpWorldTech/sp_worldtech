const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: String, required: true },
  courseTitle: { type: String, required: true },
  completedLessons: { type: Number, default: 0 },
  totalLessons: { type: Number, default: 0 },
  quizScore: { type: Number, default: 0 },
  assignmentSubmitted: { type: Boolean, default: false },
  finalProjectSubmitted: { type: Boolean, default: false },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' }
}, { timestamps: true });

courseProgressSchema.index({ user: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('CourseProgress', courseProgressSchema);
