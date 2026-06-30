const CourseProgress = require('../models/CourseProgress');
const Certificate = require('../models/Certificate');
const { courses, getCourse } = require('../services/academyCatalog');
const { generateAcademyContent } = require('../services/aiTutorService');

function makeCertificateId(userId, courseId) {
  const stamp = Date.now().toString(36).toUpperCase();
  return `SPW-ACA-${String(courseId).slice(0, 4).toUpperCase()}-${String(userId).slice(-4).toUpperCase()}-${stamp}`;
}

exports.getCourses = async (req, res) => {
  res.json({ courses });
};

exports.getMyProgress = async (req, res) => {
  const progress = await CourseProgress.find({ user: req.user._id }).sort({ updatedAt: -1 });
  const certificates = await Certificate.find({ user: req.user._id }).sort({ issuedAt: -1 });
  res.json({ courses, progress, certificates });
};

exports.updateProgress = async (req, res) => {
  const { courseId, completedLessons, quizScore, assignmentSubmitted, finalProjectSubmitted } = req.body;
  const course = getCourse(courseId);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  const status = Number(completedLessons || 0) >= course.lessons && Number(quizScore || 0) >= 70 && assignmentSubmitted && finalProjectSubmitted ? 'completed' : 'in_progress';
  const progress = await CourseProgress.findOneAndUpdate(
    { user: req.user._id, courseId },
    { courseTitle: course.title, totalLessons: course.lessons, completedLessons, quizScore, assignmentSubmitted, finalProjectSubmitted, status },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ message: 'Course progress saved', progress });
};

exports.generateTutorContent = async (req, res) => {
  try {
    const { courseId, topic, promptType } = req.body;
    const course = getCourse(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const content = await generateAcademyContent({ courseTitle: course.title, topic, promptType });
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.issueCertificate = async (req, res) => {
  const { courseId } = req.body;
  const course = getCourse(courseId);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  const progress = await CourseProgress.findOne({ user: req.user._id, courseId });
  if (!progress || progress.status !== 'completed') return res.status(400).json({ message: 'Complete all lessons, quiz, assignment and final project before certificate issuance.' });

  let certificate = await Certificate.findOne({ user: req.user._id, courseId, status: 'active' });
  if (!certificate) {
    const certificateId = makeCertificateId(req.user._id, courseId);
    certificate = await Certificate.create({
      user: req.user._id,
      fullName: req.user.fullName,
      courseId,
      courseTitle: course.title,
      certificateId,
      verificationUrl: `/certificate.html?id=${certificateId}`
    });
  }
  res.status(201).json({ message: 'Certificate ready', certificate });
};

exports.verifyCertificate = async (req, res) => {
  const certificate = await Certificate.findOne({ certificateId: req.params.certificateId, status: 'active' }).select('-user');
  if (!certificate) return res.status(404).json({ message: 'Certificate not found or revoked' });
  res.json({ certificate });
};
