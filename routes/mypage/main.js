const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');
const moment = require

// 마이페이지 메인 화면
router.get('/',(req, res)=>{

  var user_id;

  let taskArray = [
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
            callback(null,verify_data,connection);
        }
      });
    },

    (verify_data, connection, callback) => {

      let getUserInfo =
      `
      SELECT *
      FROM user
      WHERE user_id = ?
      `
      connection.query(getUserInfo, user_id, (err, user_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          var user_json = {};

          user_json.user_img = user_data[0].user_img;
          user_json.user_name = user_data[0].user_name;
          user_json.user_level = user_data[0].user_level;
          user_json.user_att_cnt = user_data[0].user_att_cnt;
          user_json.user_plan_alarm = user_data[0].user_plan_alarm;

          res.status(200).send({
            status : true,
            message : "successful get main mypage",
            result : user_json
          });
          connection.release();
        }
      });
    }

  ];
  async.waterfall(taskArray , (err, result)=> {
		if(err) console.log(err);
		else console.log(result);
	});
});

module.exports = router;
