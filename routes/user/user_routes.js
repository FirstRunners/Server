/*
 Default module
*/
const express = require('express');
const router = express.Router();

 router.use('/signin', require('../user/signin'));
 router.use('/signup', require('../user/signup'));

module.exports = router;
