const express = require('express');
const router = express.Router();
const jwt = require('../../module/jwt.js');
const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const pool = require('../../config/dbPool');
const async = require('async');
const moment = require('moment');
aws.config.loadFromPath('./config/aws_config.json');
const s3 = new aws.S3();
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'learners',
    acl: 'public-read',
    key: function(req, file, callback) {
      callback(null, Date.now() + '.' + file.originalname.split('.').pop());
    }
  })
});

// 프로필 사진 변경
router.post('/',upload.single('user_img'), function(req, res){

  var user_id;
  var image;

  console.log(req.file);

  if(!req.file){
    image = null;
  } else{
    image = req.file.location;
  }

  let task = [
    (callback) => {
      const verify_data = jwt.verify(req.headers.user_token);
      if (verify_data == undefined) {
          res.status(200).send({
            status: false,
            message: "invalid authentication"
          });
      }else{
        user_id = verify_data.user_id;
        callback(null, verify_data);
      }
    },
    (verify_data, callback) => {
      pool.getConnection((err, connection) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          callback("DB connection err : " + err);
        } else{
          callback(null, verify_data, connection);
        }
      });
    },
    (verify_data, connection,callback)=>{
      let updateImgQuery =
      `
      UPDATE user
      SET user_img = ?
      WHERE user_id = ?
      `
      connection.query(updateImgQuery, [image, user_id], (err, update_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("update user img fail : " + err);
        } else{
          res.status(200).send({
            status : true,
            message : "successful update user img"
          });
          connection.release();
        }
      });
    }
  ];

  async.waterfall(task, (err,result)=>{
    if(err) console.log(err);
    else console.log(result);
  });
});

module.exports = router;
