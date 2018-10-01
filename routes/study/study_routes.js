/*
 Default module
*/
const express = require('express');
const router = express.Router();

router.use('/new', require('../study/new'));
router.use('/invite', require('../study/invite'));

module.exports = router;
