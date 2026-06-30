const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { getCourses, getMyProgress, updateProgress, generateTutorContent, issueCertificate, verifyCertificate } = require('../controllers/academyController');

router.get('/courses', getCourses);
router.get('/me', protect, getMyProgress);
router.post('/progress', protect, updateProgress);
router.post('/tutor', protect, generateTutorContent);
router.post('/certificate', protect, issueCertificate);
router.get('/certificate/:certificateId', verifyCertificate);

module.exports = router;
