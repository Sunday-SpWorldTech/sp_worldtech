const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/giftCardController');

router.get('/status', controller.status);
router.get('/catalog', controller.getCatalog);
router.post('/orders', protect, authorize('user'), controller.createOrder);
router.get('/orders/mine', protect, authorize('user'), controller.myOrders);
router.get('/orders/admin', protect, authorize('admin', 'owner', 'staff'), controller.adminOrders);
router.patch('/orders/:id/status', protect, authorize('admin', 'owner', 'staff'), controller.updateOrderStatus);

module.exports = router;
