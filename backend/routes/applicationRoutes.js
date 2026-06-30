const router = require('express').Router();
const { createApplication, submitCompletedJob, getMyApplications } = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('user'), createApplication);
router.post('/:id/submit', protect, authorize('user'), submitCompletedJob);
router.get('/me', protect, authorize('user'), getMyApplications);

module.exports = router;
