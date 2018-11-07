const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');

// 과제 체크
router.post('/:plan_id',(req, res)=>{

  var date = req.body.hw_check_date;
  var time = req.body.hw_check_time;
  var user_id;
  var plan_id = req.params.plan_id;
  var study_id;
  var check_flag; // 오늘 과제 체크를 했는지

  var tmp_date = date.split('.');
  date = '20' + tmp_date[0] + '-' + tmp_date[1] + '-' + tmp_date[2];

  // var tmp_date = new Date();
  // var today = tmp_date.toISOString().split('T')[0];

  var tmp_date = new Date();
  tmp_date.setHours(tmp_date.getHours()+9);
  var tmp_today = tmp_date.toISOString().split('T')[0];
  var today = new Date(tmp_today);

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
      // 스터디 아이디 가져오기
      let getStudyIDQuery =
      `
      SELECT user_study_id
      FROM user
      WHERE user_id = ?
      `
      connection.query(getStudyIDQuery, user_id, (err, study_ID_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          study_id = study_ID_data[0].user_study_id;
          callback(null,study_ID_data,verify_data,connection);
        }
      });
    },

    (study_ID_data, verify_data, connection, callback) => {
      let hwCheckQuery =
      `
      SELECT *
      FROM homework
      WHERE hw_user_id = ? and hw_plan_id = ? and hw_check_date = ?
      `;

      // 오늘 과제체크를 했는지 체크 => check_flag
      connection.query(hwCheckQuery, [user_id, plan_id, today], (err, check_data) => {
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

    (check_data, study_ID_data, verify_data, connection, callback) => {

        // 오늘 과제체크 하지 않은 경우
        if(check_data.length == 0){
          check_flag = false;
          // homework 테이블에 insert
          let hwInsertQuery =
          `
          INSERT INTO homework values(?,?,?,?,?,?)
          `;

          connection.query(hwInsertQuery, [null,user_id,study_id,plan_id,date,time], (err, insert_data) => {
            if(err){
              res.status(500).send({
                status : false,
                message : "500 error"
              });
              connection.release();
              callback("insert user into homework fail : " + err);
            } else{
              // user_hw_cnt 증가
              let updateUserQuery =
              `
              UPDATE user
              SET user_hw_cnt = user_hw_cnt + 1
              WHERE user_id = ?
              `;
              connection.query(updateUserQuery, [user_id], (err, update_data) => {
                if(err){
                  res.status(500).send({
                    status : false,
                    message : "500 error"
                  });
                  connection.release();
                  callback("update user hw count fail : " + err);
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

    // 과제 체크 한 사람 정보 가져오기
    (connection, callback) => {
      let selectUserQuery =
      `
      SELECT user.user_name, homework.hw_check_date, homework.hw_check_time
      FROM user, homework
      WHERE user.user_id = homework.hw_user_id and homework.hw_user_id = ? and homework.hw_check_date = ?
      `;
      connection.query(selectUserQuery, [user_id,date], (err, select_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          var result_info = {};
          var result_hw_users = [];

          for(let r=0; r<select_data.length; r++){
            var users_info = {};
            users_info.user_name = select_data[r].user_name;
            users_info.hw_check_date = select_data[r].hw_check_date;
            users_info.hw_check_time = select_data[r].hw_check_time;
            result_hw_users.push(users_info);
          }

          result_info.hw_users = result_hw_users;

          res.status(200).send({
            status : true,
            message : "successful get and post hw check",
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
