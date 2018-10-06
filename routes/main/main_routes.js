/*
 Default module
*/
const express = require('express');
const router = express.Router();

router.use('/check', require('../main/check'));
router.use('/graph', require('../main/graph'));
router.use('/detail', require('../main/detail'));

router.use('/graph_test', require('../main/graph_test'));



module.exports = router;
