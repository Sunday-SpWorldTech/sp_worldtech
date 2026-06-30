const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/spTokenController');

router.get('/catalog', controller.getCatalog);
router.post('/deposit/checkout', protect, authorize('user'), controller.createCheckout);
router.post('/deposit/verify/:reference', protect, authorize('user'), controller.verifyCheckout);
router.post('/redeem', protect, authorize('user'), controller.redeem);
router.get('/mine', protect, authorize('user'), controller.myVouchers);

module.exports = router;
