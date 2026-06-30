const router = require('express').Router();
const ai = require('../controllers/aiController');
const { protect, authorize } = require('../middleware/auth');

router.post('/chat', ai.chat);
router.post('/academy', protect, authorize('user'), ai.academy);
router.post('/support', protect, ai.support);
router.post('/admin-message', protect, authorize('admin'), ai.adminMessage);
router.post('/job-client-message', protect, authorize('admin'), ai.jobClientMessage);

module.exports = router;
