/*
 Default module
*/
const express = require('express');
const router = express.Router();

router.use('/user', require('./user/user_routes'));
router.use('/study', require('./study/study_routes'));
router.use('/main', require('./main/main_routes'));
router.use('/plan', require('./plan/plan_routes'));
router.use('/mypage', require('./mypage/mypage_routes'));

module.exports = router;
