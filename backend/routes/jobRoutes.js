const router = require('express').Router();
const {
  getPublicJobs,
  getPublicJob,
  getJobs,
  getRemoteTechJobs,
  getLiveJobs,
  getSalaryData,
  jobAssistant,
  createJob,
  syncJobs,
  saveJob,
  removeSavedJob,
  getSavedJobs,
  generateAIClientMessage,
  updateAIMessage,
  listClientContacts,
  updateClientContact
} = require('../controllers/jobController');
const { protect, authorize } = require('../middleware/auth');
const { createApplication } = require('../controllers/applicationController');

router.get('/public', getPublicJobs);
router.get('/public/:id', getPublicJob);
router.get('/search', protect, getJobs);
router.get('/live', getLiveJobs);
router.get('/salary', protect, getSalaryData);
router.post('/assistant', protect, jobAssistant);
router.get('/remote', protect, getRemoteTechJobs);
router.get('/remote-tech', protect, getRemoteTechJobs);
router.get('/saved/me', protect, authorize('user'), getSavedJobs);
router.post('/apply', protect, authorize('user'), createApplication);
router.post('/:id/save', protect, authorize('user'), saveJob);
router.delete('/:id/save', protect, authorize('user'), removeSavedJob);
router.post('/', protect, authorize('admin'), createJob);
router.post('/sync', protect, authorize('admin'), syncJobs);
router.post('/applications/:applicationId/ai-message', protect, authorize('admin'), generateAIClientMessage);
router.patch('/ai-messages/:id', protect, authorize('admin'), updateAIMessage);
router.get('/client-contacts/list', protect, authorize('admin'), listClientContacts);
router.patch('/client-contacts/:id', protect, authorize('admin'), updateClientContact);
router.get('/', protect, getJobs);

module.exports = router;
