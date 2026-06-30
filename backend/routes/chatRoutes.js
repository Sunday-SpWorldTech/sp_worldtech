const router = require('express').Router();
const { getMyMessages, sendUserMessage, sendStaffReply } = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/auth');

router.get('/me', protect, getMyMessages);
router.post('/send', protect, authorize('user'), sendUserMessage);
router.post('/staff-reply', protect, authorize('admin', 'staff'), sendStaffReply);

module.exports = router;
