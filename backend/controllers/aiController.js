const AIChatHistory = require('../models/AIChatHistory');
const AdminAIDraft = require('../models/AdminAIDraft');
const StudentAISession = require('../models/StudentAISession');
const SupportTicket = require('../models/SupportTicket');
const Application = require('../models/Application');
const { callOpenWebNinjaAI } = require('../services/openWebNinjaAIService');

const SENSITIVE = /payment|paid|wallet|withdraw|withdrawal|bank|account|virtual card|card|kyc|blocked|complaint|failed|api|strowallet|luno|crypto|deposit|transfer|refund|chargeback|fraud|limit|pin|password|otp/i;

function role(req) { return req.user?.role || 'guest'; }
function safeMessage(req) { return String(req.body.message || req.body.question || req.body.prompt || '').trim(); }

async function saveHistory({ req, context, provider, question, answer, escalated = false, ticket = null }) {
  return AIChatHistory.create({ user: req.user?._id, role: role(req), context, provider, question, answer, escalated, ticket: ticket?._id });
}

exports.chat = async (req, res) => {
  try {
    const message = safeMessage(req);
    const context = req.body.context || 'website-knowledge';
    const provider = req.body.provider || 'copilot';
    const result = await callOpenWebNinjaAI({ provider, context, message, user: req.user, system: 'You answer as SP WorldTech website knowledge AI. Explain platform features accurately and never expose API details.' });
    await saveHistory({ req, context, provider, question: message, answer: result.content });
    res.json({ answer: result.content, provider });
  } catch (error) { res.status(error.statusCode || 500).json({ message: error.message }); }
};

exports.academy = async (req, res) => {
  try {
    const message = safeMessage(req);
    const provider = req.body.provider || 'copilot';
    const context = `academy-ai-tutor:${req.body.courseId || ''}:${req.body.promptType || 'question'}`;
    const system = 'You are SP WorldTech Academy AI Tutor. Teach coding clearly. Give learning guidance, examples, quizzes and assignments. Only issue certificates and grades after verified course requirements are completed.';
    const result = await callOpenWebNinjaAI({ provider, context, message, user: req.user, system, extra: { courseId: req.body.courseId, promptType: req.body.promptType } });
    await StudentAISession.create({ user: req.user._id, courseId: req.body.courseId || '', topic: req.body.topic || '', promptType: req.body.promptType || 'question', question: message, answer: result.content, provider });
    res.json({ answer: result.content, content: result.content, provider });
  } catch (error) { res.status(error.statusCode || 500).json({ message: error.message }); }
};

exports.support = async (req, res) => {
  try {
    const message = safeMessage(req);
    const provider = req.body.provider || 'copilot';
    const context = req.body.context || 'support-auto-reply';
    const needsEscalation = SENSITIVE.test(message);
    const system = needsEscalation
      ? 'You are SP WorldTech support AI. Give a short professional acknowledgement, explain that this needs admin/staff review, and do not take final payment/banking/crypto action.'
      : 'You are SP WorldTech support AI. Answer normal platform questions professionally and concisely.';
    const result = await callOpenWebNinjaAI({ provider, context, message, user: req.user, system });
    let ticket = null;
    if (needsEscalation && req.user?._id) {
      ticket = await SupportTicket.create({
        user: req.user._id,
        subject: req.body.subject || 'AI support escalation',
        category: req.body.category || (context.includes('crypto') || /luno|crypto/i.test(message) ? 'Crypto Support' : 'Support'),
        priority: 'High',
        message,
        replies: [{ senderRole: 'staff', message: `AI escalation note: ${result.content}` }]
      });
    }
    await saveHistory({ req, context, provider, question: message, answer: result.content, escalated: needsEscalation, ticket });
    res.json({ answer: result.content, escalated: needsEscalation, ticketId: ticket?._id || null });
  } catch (error) { res.status(error.statusCode || 500).json({ message: error.message }); }
};

exports.adminMessage = async (req, res) => {
  try {
    const message = safeMessage(req);
    const provider = req.body.provider || 'copilot';
    const draftType = req.body.draftType || 'admin-message';
    const recipientType = req.body.recipientType || 'internal';
    const system = 'You are SP WorldTech admin AI. Draft professional messages only. The admin must review and approve before sending.';
    const result = await callOpenWebNinjaAI({ provider, context: draftType, message, user: req.user, system });
    const draft = await AdminAIDraft.create({ createdBy: req.user._id, draftType, recipientType, subject: req.body.subject || '', message: result.content, application: req.body.applicationId || undefined, ticket: req.body.ticketId || undefined });
    res.json({ message: 'AI draft generated. Admin must review before sending.', draft, answer: result.content });
  } catch (error) { res.status(error.statusCode || 500).json({ message: error.message }); }
};

exports.jobClientMessage = async (req, res) => {
  try {
    const application = await Application.findById(req.body.applicationId).populate('job').populate('user');
    if (!application) return res.status(404).json({ message: 'Application not found.' });
    const job = application.job;
    const provider = req.body.provider || 'copilot';
    const prompt = `Draft a professional client outreach message as SP WorldTech for this job application. Job title: ${job?.title}. Company: ${job?.company}. Applicant skills: ${(application.skills || []).join(', ')}. Cover letter summary: ${application.coverLetter || 'No cover letter provided'}. Do not send private resume details unless client requests and admin approves. Brand signature: SP WorldTech — The World 🌎 Web, Applications & Software Solutions.`;
    const result = await callOpenWebNinjaAI({ provider, context: 'job-client-message', message: prompt, user: req.user, system: 'Draft only. Do not claim the client accepted. Do not promise payment.' });
    const draft = await AdminAIDraft.create({ createdBy: req.user._id, application: application._id, draftType: 'job-client-message', recipientType: 'client', subject: `SP WorldTech applicant for ${job?.title || 'your role'}`, message: result.content });
    res.json({ message: 'Client outreach draft generated for admin review only.', draft, answer: result.content });
  } catch (error) { res.status(error.statusCode || 500).json({ message: error.message }); }
};
