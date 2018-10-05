const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');

// 출석 체크
router.post('/:study_id',(req, res)=>{

  var date = req.body.att_check_date;
  var time = req.body.att_check_time;
  var user_id;
  var study_id = req.params.study_id;

  var tmp_date = new Date();
  var today = tmp_date.toISOString().split('T')[0];

  var check_flag; // 이미 출석체크를 했으면 true

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
      let attCheckQuery =
      `
      SELECT *
      FROM attendance
      WHERE att_user_id = ? and att_study_id = ? and att_check_date = ?
      `;

      // 오늘 출석체크를 했는지 체크 => check_flag
      connection.query(attCheckQuery, [user_id, study_id, today], (err, check_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          callback(null,check_data,verify_data,connection);
        }
      });
    },

    (check_data, verify_data, connection, callback) => {

        // 오늘 출석체크 하지 않은 경우
        if(check_data.length == 0){
          check_flag = false;
          // att테이블에 insert
          let attInsertQuery =
          `
          INSERT INTO attendance values(?,?,?,?,?);
          `;

          connection.query(attInsertQuery, [null,user_id,study_id,date,time], (err, insert_data) => {
            if(err){
              res.status(500).send({
                status : false,
                message : "500 error"
              });
              connection.release();
              callback("insert user into attendance fail : " + err);
            } else{
              // user_att_cnt 증가
              let updateUserQuery =
              `
              UPDATE user
              SET user_att_cnt = user_att_cnt + 1
              WHERE user_id = ?
              `;
              connection.query(updateUserQuery, [user_id], (err, update_data) => {
                if(err){
                  res.status(500).send({
                    status : false,
                    message : "500 error"
                  });
                  connection.release();
                  callback("update user att count fail : " + err);
                } else{
                  callback(null,connection);
                }
              });
            }
          });
        }
        // 이미 출석 체크 한 경우
        else{
          check_flag = true;
          callback(null,connection);
        }
    },

    // 오늘 출석 한 사람 정보 가져오기
    (connection, callback) => {
      let selectUserQuery =
      `
      SELECT user.user_name, attendance.att_check_date, attendance.att_check_time
      FROM user, attendance
      WHERE user.user_id = attendance.att_user_id and attendance.att_user_id = ? and attendance.att_check_date = ?
      `;
      connection.query(selectUserQuery, [user_id,today], (err, select_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          var result_info = {};
          var result_attend_users = [];

          for(let r=0; r<select_data.length; r++){
            var users_info = {};
            users_info.user_name = select_data[r].user_name;
            users_info.attend_date = select_data[r].att_check_date;
            users_info.attend_time = select_data[r].att_check_time;
            result_attend_users.push(users_info);
          }

          result_info.check_flag = check_flag;
          result_info.attend_users = result_attend_users;

          res.status(200).send({
            status : true,
            message : "successful attendance check",
            result : result_info
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
