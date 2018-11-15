/*
 Default module
*/
const express = require('express');
const router = express.Router();

router.use('/new', require('../study/new'));
router.use('/invite', require('../study/invite'));
router.use('/invite_web', require('../study/invite_web'));

module.exports = router;
