const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');
const moment = require('moment');

// 스터디 생성
router.post('/',(req, res)=>{

  let temp_users = [];
  let temp_hws = [];
  var study_hws = temp_hws;
  var study_users = temp_users;
  var name = req.body.study_name;
  var goal = req.body.study_goal;
  var inwon = req.body.study_inwon;
  var start = req.body.study_start;
  var end = req.body.study_end;
  var count = req.body.study_count;

  console.log(req.body);

  console.log("이름: " , name);
  console.log("목표: " , goal);
  console.log("인원: " , inwon);
  console.log("시작날짜: " , start);
  console.log("완료날짜: " , end);
  console.log("횟수:" , count);

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

      temp_users.push(verify_data.user_id); // 스터디 인원 배열에 스터디 생성 한 사람 넣기
      study_users = JSON.stringify(temp_users);
      study_hws = JSON.stringify(temp_hws);

      console.log(study_users);
      console.log(study_hws);

      let newStudyQuery =
      `
      INSERT INTO study values(?,?,?,?,?,?,?,?,?,?)
      `;

      // 스터디 insert
      connection.query(newStudyQuery, [null,name,goal,inwon,tmp_startDate,tmp_endDate,period,count,study_users,study_hws], (err, data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("make new study fail : " + err);
        } else{
          callback(null,data,verify_data,connection);
        }
      });
    },

    // 현재 스터디 생성하는 유저로 스터디 아이디 찾기
    (data, verify_data, connection, callback) => {
      let studyIDQuery =
      `
      SELECT study_id
      FROM study
      WHERE study_users in (?)
      `;

      connection.query(studyIDQuery, study_users, (err, studyID_data) => {
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
          var tmp_id = (studyID_data[0].study_id).toString();
          var real_id = parseInt(tmp_id);

          console.log(real_id);
          console.log(typeof(real_id));

          var info = {};
          info.study_id = real_id;

          res.status(200).send({
            status : true,
            message : "successful make study",
            result : info
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
