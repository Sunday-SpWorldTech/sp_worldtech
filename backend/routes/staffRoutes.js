const router = require('express').Router();
const { getDashboard, getPlatformSettings, approveApplication, rejectApplication, updateApplicationStatus, approveWithdrawal, rejectWithdrawal } = require('../controllers/staffController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, authorize('admin', 'staff'), getDashboard);
router.get('/platform-settings', protect, authorize('owner'), getPlatformSettings);
router.post('/applications/:id/approve', protect, authorize('admin'), approveApplication);
router.post('/applications/:id/reject', protect, authorize('admin'), rejectApplication);
router.patch('/applications/:id/status', protect, authorize('admin'), updateApplicationStatus);
router.post('/withdrawals/:id/approve', protect, authorize('admin'), approveWithdrawal);
router.post('/withdrawals/:id/reject', protect, authorize('admin'), rejectWithdrawal);

module.exports = router;
