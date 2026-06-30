const router = require('express').Router();
const { createClientPayment, markClientPaymentSettled, listClientPayments } = require('../controllers/clientPaymentController');
const { protect, authorize } = require('../middleware/auth');
router.post('/', createClientPayment);
router.get('/', protect, authorize('admin'), listClientPayments);
router.post('/:id/settle', protect, authorize('admin'), markClientPaymentSettled);
module.exports = router;
