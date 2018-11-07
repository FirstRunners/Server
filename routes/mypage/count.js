const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');
const moment = require

// 스터디 횟수 변경
router.post('/',(req, res)=>{

  var user_id;
  var study_id;

  var study_count = req.body.study_count;

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
      let query =
      `
      SELECT user_study_id
      FROM user
      WHERE user_id = ?
      `

      connection.query(query, user_id, (err, user_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          if(user_data[0].user_study_id == null){
            res.status(200).send({
              status : true,
              message : "there is no study"
            });
            connection.release();
          }else{
            user_study_id = user_data[0].user_study_id;
            callback(null,user_data,verify_data,connection);
          }
        }
      });
    },

    (user_data, verify_data, connection, callback) => {
      let updateQuery =
      `
      UPDATE study
      SET study_count = ?
      WHERE study_id = ?
      `

      connection.query(updateQuery, [study_count, user_study_id], (err, data) => {
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
            message : "successful change study count"
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
