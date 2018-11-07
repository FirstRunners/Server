const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');
const moment = require

// 일정 알림 변경
router.put('/',(req, res)=>{

  var user_id;
  var message;
  var query;

  let taskArray = [
    (callback) => {
      const verify_data = jwt.verify(req.headers.user_token);
      if (verify_data == undefined) {
          res.status(200).send({
            status: false,
            message: "invalid authentication"
          });
      }else{
        console.log(req.body.user_plan_alarm);
        user_id = verify_data.user_id;
        if(req.body.user_plan_alarm == 0){
          message = "successful alarm off";
          query = `UPDATE user SET user_plan_alarm = 0 WHERE user_id = ?`;
        }
        else{
          message = "successful alarm on";
          query = `UPDATE user SET user_plan_alarm = 1 WHERE user_id = ?`;
        }
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

      connection.query(query, user_id, (err, user_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          res.status(200).send({
            status : true,
            message : message
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
