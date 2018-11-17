/*
 Default module
*/
const express = require('express');
const router = express.Router();

router.use('/main', require('../mypage/main'));
router.use('/signout', require('../mypage/signout'));
router.use('/alarm', require('../mypage/alarm'));
router.use('/period', require('../mypage/period'));
router.use('/count', require('../mypage/count'));
router.use('/studyout', require('../mypage/studyout'));
router.use('/edit-photo', require('../mypage/edit-photo.js'));


module.exports = router;
