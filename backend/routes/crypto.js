const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/cryptoController');
const { protect, authorize } = require('../middleware/auth');

router.get('/markets', cryptoController.markets);
router.get('/prices', cryptoController.prices);
router.post('/calculate', cryptoController.calculate);
router.post('/buy', protect, cryptoController.buy);
router.post('/sell', protect, cryptoController.sell);
router.post('/deposit/initiate', protect, cryptoController.initiateDeposit);
router.post('/deposit/verify', protect, cryptoController.verifyDeposit);
router.post('/withdraw', protect, cryptoController.withdraw);
router.get('/transactions', protect, cryptoController.transactions);
router.get('/portfolio', protect, cryptoController.portfolio);

router.get('/admin/orders', protect, authorize('admin', 'owner'), cryptoController.adminOrders);
router.get('/admin/withdrawals', protect, authorize('admin', 'owner'), cryptoController.adminWithdrawals);
router.post('/admin/withdrawals/:id/approve', protect, authorize('admin', 'owner'), cryptoController.approveWithdrawal);
router.post('/admin/withdrawals/:id/reject', protect, authorize('admin', 'owner'), cryptoController.rejectWithdrawal);

module.exports = router;
