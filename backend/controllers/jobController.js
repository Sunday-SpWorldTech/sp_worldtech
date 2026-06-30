const mongoose = require('mongoose');
const Job = require('../models/Job');
const SavedJob = require('../models/SavedJob');
const ClientContact = require('../models/ClientContact');
const AIMessage = require('../models/AIMessage');
const JobActivityLog = require('../models/JobActivityLog');
const JobNotification = require('../models/JobNotification');
const { ensureJobs, splitAmounts, upsertJobs } = require('../services/jobService');
const { fetchRemoteTechJobs, fetchCombinedJobs, fetchJobSalary, callJobAI } = require('../services/openWebNinjaService');

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function listFromQuery(value) {
  if (!value) return [];
  return String(value).split(',').map(item => item.trim()).filter(Boolean);
}

function buildFilters(query = {}) {
  const filters = { status: query.status || 'open', source: { $in: ['openwebninja_job_research_api', 'openwebninja_realtime_jobs_data', 'openwebninja_jsearch', 'admin_created'] } };
  const textParts = [query.q, query.search].filter(Boolean).join(' ').trim();
  if (textParts) {
    const value = escapeRegex(textParts);
    filters.$or = [
      { title: { $regex: value, $options: 'i' } },
      { description: { $regex: value, $options: 'i' } },
      { shortDescription: { $regex: value, $options: 'i' } },
      { company: { $regex: value, $options: 'i' } },
      { skills: { $regex: value, $options: 'i' } },
      { location: { $regex: value, $options: 'i' } },
      { country: { $regex: value, $options: 'i' } }
    ];
  }
  if (query.company) filters.company = { $regex: escapeRegex(query.company), $options: 'i' };
  if (query.skills) filters.skills = { $in: listFromQuery(query.skills).map(skill => new RegExp(escapeRegex(skill), 'i')) };
  if (query.location) filters.location = { $regex: escapeRegex(query.location), $options: 'i' };
  if (query.category) filters.category = { $regex: escapeRegex(query.category), $options: 'i' };
  if (query.country) filters.country = { $regex: escapeRegex(query.country), $options: 'i' };
  if (query.workMode) filters.workMode = query.workMode;
  if (query.remote === 'true') filters.workMode = 'Remote';
  if (query.hybrid === 'true') filters.workMode = 'Hybrid';
  if (query.onsite === 'true') filters.workMode = 'On-site';
  if (query.employmentType) filters.employmentType = { $regex: escapeRegex(query.employmentType), $options: 'i' };
  if (query.experienceLevel) filters.experienceLevel = { $regex: escapeRegex(query.experienceLevel), $options: 'i' };
  if (query.salaryMin || query.salaryMax) {
    filters.salaryAmount = {};
    if (query.salaryMin) filters.salaryAmount.$gte = Number(query.salaryMin);
    if (query.salaryMax) filters.salaryAmount.$lte = Number(query.salaryMax);
  }
  if (query.posted) {
    const now = new Date();
    const days = query.posted === 'today' ? 1 : query.posted === '7days' ? 7 : query.posted === '30days' ? 30 : 0;
    if (days) filters.$or = [{ postedAt: { $gte: new Date(now.getTime() - days * 86400000) } }, { createdAt: { $gte: new Date(now.getTime() - days * 86400000) } }];
  }
  return filters;
}

function getPagination(query = {}, defaultLimit = 20, maxLimit = 100) {
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), maxLimit);
  const page = Math.max(Number(query.page) || 1, 1);
  const skip = (page - 1) * limit;
  return { limit, page, skip };
}

function userSafeJob(job) {
  const plain = typeof job.toObject === 'function' ? job.toObject() : job;
  return {
    _id: plain._id,
    externalId: plain.externalId,
    title: plain.title,
    description: plain.description,
    shortDescription: plain.shortDescription,
    responsibilities: plain.responsibilities || [],
    requirements: plain.requirements || [],
    skills: plain.skills || [],
    benefits: plain.benefits || [],
    category: plain.category,
    company: plain.company,
    companyLogo: plain.companyLogo,
    companyInfo: plain.companyInfo,
    location: plain.location,
    country: plain.country,
    workMode: plain.workMode,
    employmentType: plain.employmentType,
    experienceLevel: plain.experienceLevel,
    salary: plain.salary,
    salaryAmount: plain.salaryAmount,
    applyLink: plain.applyLink,
    userVisibleAmount: plain.userVisibleAmount,
    dueDate: plain.dueDate,
    postedAt: plain.postedAt,
    closingDate: plain.closingDate,
    source: plain.source,
    status: plain.status,
    createdAt: plain.createdAt
  };
}

async function fetchJobs(query, defaultLimit, safeForUser = false) {
  const searchText = [query.q, query.search].filter(Boolean).join(' ').trim();
  const syncResult = await ensureJobs({
    query: searchText || query.query || process.env.OPENWEBNINJA_JOB_QUERY || 'developer jobs in chicago',
    limit: Math.min(Number(query.limit) || defaultLimit || 20, 60),
    country: query.country || '',
    remote: query.remote === 'true' || query.workMode === 'Remote'
  });
  const filters = buildFilters(query);
  const { limit, page, skip } = getPagination(query, defaultLimit);
  const [jobs, total] = await Promise.all([
    Job.find(filters).sort({ postedAt: -1, createdAt: -1 }).skip(skip).limit(limit),
    Job.countDocuments(filters)
  ]);
  return {
    jobs: safeForUser ? jobs.map(userSafeJob) : jobs,
    meta: { total, page, limit, pages: Math.ceil(total / limit) || 1, source: 'openwebninja_jobs_cached_in_mongodb', sync: syncResult }
  };
}

exports.getPublicJobs = async (req, res) => {
  try {
    const result = await fetchJobs(req.query, 12, true);
    res.json(result);
  } catch (error) {
    res.status(503).json({ message: error.message, jobs: [], meta: { total: 0, page: 1, pages: 1 } });
  }
};

exports.getPublicJob = async (req, res) => {
  try {
    const lookup = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { externalId: req.params.id };
    const job = await Job.findOne(lookup);
    if (!job || job.status !== 'open') return res.status(404).json({ message: 'Job not found' });
    await JobActivityLog.create({ job: job._id, action: 'Job Viewed', message: 'Public job details viewed.' }).catch(() => null);
    res.json({ job: userSafeJob(job) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getJobs = async (req, res) => {
  const isAdmin = ['admin', 'owner'].includes(req.user?.role);
  const result = await fetchJobs(req.query, 60, !isAdmin);
  res.json(result);
};

exports.createJob = async (req, res) => {
  try {
    const { title, description, category, fullAmount, dueDate, company, location, applyLink, status } = req.body;
    if (!title || !description || !fullAmount) return res.status(400).json({ message: 'Provide title, description, and full project amount.' });
    const chargePercent = Number(req.body.transactionChargePercent || 2);
    const job = await Job.create({
      ...req.body,
      title,
      description,
      category: category || 'Remote Tech Jobs',
      fullAmount: Number(fullAmount),
      ...splitAmounts(fullAmount, chargePercent),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      company: company || 'SP WorldTech Client',
      location: location || 'Remote',
      applyLink: applyLink || '',
      status: status || 'open',
      source: 'admin_created'
    });
    await JobActivityLog.create({ user: req.user._id, job: job._id, action: 'Job Created', message: 'Admin created a Job module listing.' });
    res.status(201).json({ message: 'Real backend job created successfully.', job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.syncJobs = async (req, res) => {
  const result = await ensureJobs({
    query: req.body?.query || req.query?.query || process.env.OPENWEBNINJA_JOB_QUERY || 'developer jobs in chicago',
    limit: Math.min(Number(req.body?.limit || req.query?.limit || 30), 60),
    country: req.body?.country || req.query?.country || '',
    remote: req.body?.remote === true || req.query?.remote === 'true'
  });
  res.json({ message: 'Job sync completed.', result });
};

exports.getRemoteTechJobs = async (req, res) => {
  try {
    const query = req.query.q || req.query.query || 'remote software developer jobs';
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const jobs = await fetchRemoteTechJobs({ query, limit, country: req.query.country || '' });
    await upsertJobs(jobs).catch(() => 0);
    res.json({ jobs, meta: { source: 'openwebninja_jsearch_live', limit } });
  } catch (error) {
    res.status(503).json({ message: error.message, jobs: [] });
  }
};

exports.getLiveJobs = async (req, res) => {
  try {
    const query = req.query.q || req.query.query || 'developer jobs in chicago';
    const limit = Math.min(Number(req.query.limit) || 25, 60);
    const jobs = await fetchCombinedJobs({ query, limit, country: req.query.country || '', remote: req.query.remote === 'true' });
    await upsertJobs(jobs).catch(() => 0);
    res.json({ jobs: jobs.map(userSafeJob), meta: { source: 'openwebninja_realtime_jobs_data_and_jsearch_live', limit, query } });
  } catch (error) {
    res.status(error.statusCode || 503).json({ message: error.message, jobs: [] });
  }
};

exports.getSalaryData = async (req, res) => {
  try {
    const jobTitle = req.query.job_title || req.query.jobTitle || req.query.title || 'nodejs developer';
    const location = req.query.location || 'New York';
    const salary = await fetchJobSalary({ jobTitle, location });
    res.json({ salary, meta: { source: 'openwebninja_job_salary_data', jobTitle, location } });
  } catch (error) {
    res.status(error.statusCode || 503).json({ message: error.message });
  }
};

exports.jobAssistant = async (req, res) => {
  try {
    const message = req.body.message || req.body.prompt || req.body.question || '';
    if (!String(message).trim()) return res.status(400).json({ message: 'Message is required.' });
    const provider = req.body.provider || 'copilot';
    const result = await callJobAI({ provider, message, context: req.body.context || 'job-assistant' });
    res.json({ answer: result.content, provider: result.provider });
  } catch (error) {
    res.status(error.statusCode || 503).json({ message: error.message });
  }
};

exports.saveJob = async (req, res) => {
  try {
    const lookup = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { externalId: req.params.id };
    const job = await Job.findOne(lookup);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    await SavedJob.findOneAndUpdate({ user: req.user._id, job: job._id }, { user: req.user._id, job: job._id }, { upsert: true, new: true, setDefaultsOnInsert: true });
    await JobActivityLog.create({ user: req.user._id, job: job._id, action: 'Job Saved', message: 'User saved a job.' }).catch(() => null);
    res.json({ message: 'Job saved successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.removeSavedJob = async (req, res) => {
  try {
    const lookup = mongoose.Types.ObjectId.isValid(req.params.id)
      ? { _id: req.params.id }
      : { externalId: req.params.id };
    const job = await Job.findOne(lookup);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    await SavedJob.deleteOne({ user: req.user._id, job: job._id });
    await JobActivityLog.create({ user: req.user._id, job: job._id, action: 'Job Unsaved', message: 'User removed a saved job.' }).catch(() => null);
    res.json({ message: 'Saved job removed.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getSavedJobs = async (req, res) => {
  const saved = await SavedJob.find({ user: req.user._id }).populate('job').sort({ createdAt: -1 });
  res.json({ savedJobs: saved.filter(item => item.job).map(item => ({ _id: item._id, savedAt: item.createdAt, job: userSafeJob(item.job) })) });
};

function buildClientMessage({ application, job }) {
  const company = job.company || 'Hiring Team';
  return {
    subject: `SP WorldTech applicant available for ${job.title}`,
    message: `Dear ${company},\n\nI hope you are doing well. My name is SP WorldTech Operations Team, and we are reaching out regarding the ${job.title} opportunity.\n\nA qualified applicant has applied through SP WorldTech and our team is currently reviewing the application internally. We would like to confirm whether your team is open to receiving more information about a suitable candidate for this role.\n\nAt this stage, we are not sending any resume, cover letter, portfolio, or private applicant document. We are only requesting your permission or interest so we can proceed professionally.\n\nPlease let us know if you would like to continue the conversation or receive additional details.\n\nBest regards,\nSP WorldTech Operations Team`
  };
}

exports.generateAIClientMessage = async (req, res) => {
  const Application = require('../models/Application');
  const application = await Application.findById(req.params.applicationId).populate('job').populate('user');
  if (!application) return res.status(404).json({ message: 'Application not found' });
  const job = application.job;
  const contactInfo = job?.clientEmail || job?.clientContact || '';
  if (!contactInfo) return res.status(400).json({ message: 'Client contact information is unavailable. Manual outreach is required.' });
  let generated = buildClientMessage({ application, job });
  try {
    const ai = await callJobAI({
      provider: req.body.provider || 'copilot',
      context: 'admin-client-outreach',
      message: `Draft a professional SP WorldTech client outreach message for ${job.title} at ${job.company}. Applicant skills: ${(application.skills || []).join(', ')}. Do not send resume details automatically. Admin will review before sending.`
    });
    generated = { subject: `SP WorldTech applicant available for ${job.title}`, message: ai.content };
  } catch (_error) {
    // Keep the safe built-in template if the AI provider is temporarily unavailable.
  }
  const clientContact = await ClientContact.findOneAndUpdate(
    { application: application._id },
    { application: application._id, job: job._id, clientName: job.company, company: job.company, jobTitle: job.title, contactInfo, status: 'Not Contacted' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const aiMessage = await AIMessage.create({ application: application._id, job: job._id, clientContact: clientContact._id, recipient: contactInfo, subject: generated.subject, message: generated.message, generatedBy: req.user._id });
  await JobActivityLog.create({ user: req.user._id, application: application._id, job: job._id, action: 'AI Message Generated', message: 'Admin generated a client outreach message for manual review.' });
  await JobNotification.create({ role: 'admin', title: 'AI message generated', message: `AI message generated for ${job.title}`, application: application._id, job: job._id }).catch(() => null);
  res.json({ message: 'AI message generated. Review and edit before sending manually.', aiMessage, clientContact });
};

exports.updateAIMessage = async (req, res) => {
  const aiMessage = await AIMessage.findById(req.params.id);
  if (!aiMessage) return res.status(404).json({ message: 'AI message not found' });
  if (req.body.subject !== undefined) aiMessage.subject = req.body.subject;
  if (req.body.message !== undefined) aiMessage.message = req.body.message;
  if (req.body.status !== undefined) aiMessage.status = req.body.status;
  await aiMessage.save();
  res.json({ message: 'AI message saved. Send manually only after admin approval.', aiMessage });
};

exports.listClientContacts = async (req, res) => {
  const contacts = await ClientContact.find().populate('application').populate('job').sort({ updatedAt: -1 }).limit(200);
  res.json({ contacts });
};

exports.updateClientContact = async (req, res) => {
  const contact = await ClientContact.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!contact) return res.status(404).json({ message: 'Client contact not found' });
  await JobActivityLog.create({ user: req.user._id, job: contact.job, application: contact.application, action: 'Client Tracking Updated', message: `Client status updated to ${contact.status}.` }).catch(() => null);
  res.json({ message: 'Client tracking updated.', contact });
};
