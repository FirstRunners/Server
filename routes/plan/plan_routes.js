/*
 Default module
*/
const express = require('express');
const router = express.Router();

router.use('/new', require('../plan/new'));

module.exports = router;
