/*
 Default module
*/
const express = require('express');
const router = express.Router();

router.use('/check', require('../main/check'));
router.use('/graph', require('../main/graph'));

module.exports = router;
