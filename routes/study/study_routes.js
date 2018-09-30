/*
 Default module
*/
const express = require('express');
const router = express.Router();

 router.use('/new', require('../study/new'));

module.exports = router;
