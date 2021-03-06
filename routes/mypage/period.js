const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');
const moment = require

// 스터디 기간 변경
router.post('/',(req, res)=>{

  var user_id;
  var study_id;

  var start = req.body.study_start;
  var end = req.body.study_end;

  var tmp_start = start.split('.');
  var tmp_startDate = '20' + tmp_start[0] + '-' + tmp_start[1] + '-' + tmp_start[2];
  var startDate = new Date(tmp_startDate);

  var tmp_end = end.split('.');
  var tmp_endDate = '20' + tmp_end[0] + '-' + tmp_end[1] + '-' + tmp_end[2];
  var endDate = new Date(tmp_endDate);

  var period = (endDate.getTime() - startDate.getTime()) / (1000*60*60*24);


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
          // 등록된 스터디가 없다면
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
      SET study_start = ? , study_end = ? , study_period = ?
      WHERE study_id = ?
      `

      connection.query(updateQuery, [tmp_startDate, tmp_endDate, period, user_study_id], (err, data) => {
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
            message : "successful change study period"
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
