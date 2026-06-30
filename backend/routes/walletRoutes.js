const router = require('express').Router();
const { getMyWallet, getMyProductRequests, requestWithdrawal, productRequest, getStrowalletModules, strowalletWebhook } = require('../controllers/walletController');
const { protect, authorize } = require('../middleware/auth');

router.get('/me', protect, authorize('user'), getMyWallet);
router.get('/product-requests', protect, authorize('user'), getMyProductRequests);
router.get('/strowallet/modules', protect, authorize('user'), getStrowalletModules);
router.post('/withdraw', protect, authorize('user'), requestWithdrawal);
router.post('/product-request', protect, authorize('user'), productRequest);
router.post('/strowallet/webhook', strowalletWebhook);

module.exports = router;
