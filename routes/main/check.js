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
  var date = new Date();
  var today = date.toISOString().split('T')[0];

  let taskArray = [
    (callback) => {
      const verify_data = jwt.verify(req.headers.user_token);
      if (verify_data == undefined) {
          res.status(400).send({
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
            message : "500 Error"
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
      WHERE att_user_id = ? and att_check_date = ?
      `;

      // 출석 유무 체크
      connection.query(attCheckQuery, [user_id,today], (err, att_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("make new study fail : " + err);
        } else{
          callback(null,att_data,verify_data,connection);
        }
      });
    },

    (att_data, verify_data, connection, callback) => {

        // plan_id 구해오기
        let planQuery =
        `
        SELECT *
        FROM plan
        WHERE plan_end = ?
        `;

        connection.query(planQuery, [null,user_id,study_id], (err, studyID_data) => {
          if(err){
            res.status(500).send({
              status : false,
              message : "500 error"
            });
            connection.release();
            callback("500 : " + err);
          } else{
            callback(null,data,verify_data,studyID_data,connection);
          }
        });


    },

    // 가져온 스터디 아이디로 현재 insert 하는 유저의 스터디 아이디를 업데이트
    (data, verify_data, studyID_data, connection, callback) => {
      let updateUserQuery =
      `
      UPDATE user
      SET user_study_id = ?
      WHERE user_id = ?
      `;
      connection.query(updateUserQuery, [studyID_data[0].study_id, verify_data.user_id], (err, data) => {
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
            message : "successful make study",
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
