const Application = require('../models/Application');
const Job = require('../models/Job');
const JobActivityLog = require('../models/JobActivityLog');
const JobNotification = require('../models/JobNotification');

const PUBLIC_STATUS_MAP = {
  applied: 'Submitted',
  under_review: 'Under Review',
  approved: 'Accepted',
  rejected: 'Rejected',
  refunded: 'Closed'
};

function normalizeStatus(status) {
  return PUBLIC_STATUS_MAP[status] || status || 'Submitted';
}

function splitJob(job) {
  const fullAmount = Number(job.fullAmount || job.salaryAmount || 0);
  return {
    fullAmount,
    userVisibleAmount: Math.round(fullAmount * 0.40 * 100) / 100,
    adminAmount: Math.round(fullAmount * 0.60 * 100) / 100,
    userPercent: 40,
    adminPercent: 60,
    transactionChargePercent: Number(job.transactionChargePercent || 2),
    transactionChargeAmount: Math.round(fullAmount * (Number(job.transactionChargePercent || 2) / 100) * 100) / 100
  };
}

function parseSkills(value) {
  if (Array.isArray(value)) return value.map(String).map(v => v.trim()).filter(Boolean);
  return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
}

exports.createApplication = async (req, res) => {
  try {
    const { jobId, resume, coverLetter, portfolioUrl, skills } = req.body;
    const existing = await Application.findOne({ user: req.user._id, job: jobId });
    if (existing) return res.status(400).json({ message: 'You already applied for this job' });
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!resume || !resume.dataUrl) return res.status(400).json({ message: 'Resume upload is required before submitting your application.' });

    const application = await Application.create({
      user: req.user._id,
      job: job._id,
      status: 'Submitted',
      resume: {
        filename: resume.filename || 'resume',
        mimeType: resume.mimeType || 'application/octet-stream',
        size: Number(resume.size || 0),
        dataUrl: resume.dataUrl
      },
      coverLetter: coverLetter || '',
      portfolioUrl: portfolioUrl || '',
      skills: parseSkills(skills),
      submittedAt: new Date(),
      ...splitJob(job)
    });

    await JobActivityLog.create({ user: req.user._id, application: application._id, job: job._id, action: 'Application Submitted', message: 'Application stored for SP WorldTech internal review only.' });
    await JobNotification.create({ user: req.user._id, role: 'user', title: 'Application submitted', message: `Your application for ${job.title} was submitted for SP WorldTech review.`, application: application._id, job: job._id }).catch(() => null);
    await JobNotification.create({ role: 'admin', title: 'New application received', message: `${req.user.fullName || 'A user'} applied for ${job.title}.`, application: application._id, job: job._id }).catch(() => null);

    res.status(201).json({
      message: 'Application submitted successfully for SP WorldTech internal review. Your resume and documents were not sent automatically to the client.',
      application: safeApplication(application)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.submitCompletedJob = async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, user: req.user._id }).populate('job');
    if (!application) return res.status(404).json({ message: 'Application not found' });
    if (!['Submitted', 'applied'].includes(application.status)) return res.status(400).json({ message: 'Only submitted applications can move to review' });

    application.status = 'Under Review';
    application.submittedAt = application.submittedAt || new Date();
    application.statusHistory.push({ status: 'Under Review', note: 'User requested SP WorldTech review.' });
    await application.save();

    await JobActivityLog.create({ user: req.user._id, application: application._id, job: application.job?._id, action: 'Application Under Review', message: 'Application moved to review.' });
    res.json({ message: 'Application moved under review. SP WorldTech will review before any client outreach.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

function safeApplication(item) {
  const app = item.toObject();
  app.status = normalizeStatus(app.status);
  delete app.fullAmount;
  delete app.adminAmount;
  delete app.transactionChargeAmount;
  delete app.transactionChargePercent;
  delete app.userPercent;
  delete app.adminPercent;
  if (app.resume) delete app.resume.dataUrl;
  if (app.job) {
    delete app.job.fullAmount;
    delete app.job.adminAmount;
    delete app.job.transactionChargeAmount;
    delete app.job.transactionChargePercent;
    delete app.job.clientEmail;
    delete app.job.clientContact;
  }
  return app;
}

exports.getMyApplications = async (req, res) => {
  const applications = await Application.find({ user: req.user._id }).populate('job').sort({ createdAt: -1 });
  res.json({ applications: applications.map(safeApplication) });
};
