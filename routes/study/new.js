const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');

// 스터디 생성
router.post('/',(req, res)=>{

  let study_users = [];
  var name = req.body.study_name;
  var goal = req.body.study_goal;
  var inwon = req.body.study_inwon;
  var start = req.body.study_start;
  var end = req.body.study_end;
  var count = req.body.study_count;
  var period ;

  let taskArray = [
    (callback) => {
      const verify_data = jwt.verify(req.headers.user_token);
      if (verify_data == undefined) {
          res.status(400).send({
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
            message : "500 Error"
          });
          callback("DB connection err : " + err);
        } else{
            callback(null,verify_data,connection);
        }
      });
    },
    (verify_data, connection, callback) => {

      study_users.push(verify_data.user_id); // 스터디 인원 배열에 스터디 생성 한 사람 넣기

      let newStudyQuery =
      `
      INSERT INTO study values(?,?,?,?,?,?,?,?,?,?)
      `;

      // 스터디 insert
      connection.query(newStudyQuery, [null,name,goal,inwon,start,end,period,count,study_users,null], (err, data) => {
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
