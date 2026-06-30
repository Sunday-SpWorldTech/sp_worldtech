const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/cryptoController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin', 'owner'));
router.get('/orders', cryptoController.adminOrders);
router.get('/withdrawals', cryptoController.adminWithdrawals);
router.post('/withdrawals/:id/approve', cryptoController.approveWithdrawal);
router.post('/withdrawals/:id/reject', cryptoController.rejectWithdrawal);

module.exports = router;
