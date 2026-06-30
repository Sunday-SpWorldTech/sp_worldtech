const router = require('express').Router();
const Application = require('../models/Application');
const JobActivityLog = require('../models/JobActivityLog');
const JobNotification = require('../models/JobNotification');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const applications = await Application.find(filter).populate('user', 'fullName email phone role').populate('job').sort({ createdAt: -1 }).limit(250);
  res.json({ applications });
});

router.patch('/:id/status', async (req, res) => {
  const allowed = ['Submitted', 'Under Review', 'Contacting Client', 'Client Responded', 'Interview', 'Accepted', 'Rejected', 'Closed'];
  const status = req.body.status;
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid application status.' });
  const application = await Application.findById(req.params.id).populate('job user');
  if (!application) return res.status(404).json({ message: 'Application not found.' });
  application.status = status;
  application.reviewNotes = req.body.reviewNotes || application.reviewNotes;
  application.statusHistory.push({ status, note: req.body.reviewNotes || `Admin updated status to ${status}.`, changedBy: req.user._id });
  await application.save();
  await JobActivityLog.create({ user: req.user._id, application: application._id, job: application.job?._id, action: 'Admin Status Updated', message: `Application status updated to ${status}.` }).catch(() => null);
  await JobNotification.create({ user: application.user?._id, role: 'user', title: 'Application status updated', message: `Your ${application.job?.title || 'job'} application is now ${status}.`, application: application._id, job: application.job?._id }).catch(() => null);
  res.json({ message: 'Application status updated.', application });
});

module.exports = router;
