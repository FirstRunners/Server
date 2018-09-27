/*
 Default module
*/
const express = require('express');
const router = express.Router();

router.use('/user', require('./user/user_routes'));

module.exports = router;
