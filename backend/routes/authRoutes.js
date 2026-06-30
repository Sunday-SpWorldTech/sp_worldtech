const router = require('express').Router();
const { register, userSignup, login, userPasswordLogin, verifyUserPin, staffLogin, createOperationsPin, operationsPinLogin } = require('../controllers/authController');

router.post('/register', register);
router.post('/signup', userSignup);
router.post('/login', login);
router.post('/user-login', userPasswordLogin);
router.post('/user-pin-verify', verifyUserPin);
router.post('/staff-login', staffLogin);
router.post('/operations-pin/create', createOperationsPin);
router.post('/operations-pin/login', operationsPinLogin);

module.exports = router;
