const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');

// 스터디원 초대
router.post('/:study_id',(req, res)=>{

  let invitedUsers = req.body.study_users;
  let invitedUsersName = [];
  let invitedUsersPhone = [];

  for(let i=0 ; i<invitedUsers.length ; i++){
    invitedUsersName.push(invitedUsers[i].user_name);
    invitedUsersPhone.push(invitedUsers[i].user_phone);
  }

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
        console.log(verify_data);
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
    (verify_data, connection, callback) => {
      /*
       초대를 하면 초대받는 사람의 user_study_id가 study_id로 변경되고,
       user_invite가 초대하는 사람의 이름으로 업데이트 됨.
      */
      let updateIDQuery =
      `
      UPDATE user
      SET user.user_study_id = ? , user.user_invite = ?
      WHERE user.user_name in (?) and user.user_phone in (?)
      `;

      connection.query(updateIDQuery, [req.params.study_id,verify_data.user_name,invitedUsersName,invitedUsersPhone], (err, data) => {
        if(err) {
          res.status(500).send({
            status: false,
            message: "500 error"
          });
          connection.release();
          callback("update id err : "+err);
        } else{
          res.status(200).send({
            status : true,
            message : "successful invite people"
          });
          connection.release();
          callback(null,"successful invite people");
        }
      });
    }
  ];
  async.waterfall(taskArray , (err, result)=> {
		if(err) console.log(err);
		else console.log(result);
	});
});

// 개인별 초대장 확인
router.get('/check',(req, res)=>{

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
        console.log(verify_data);
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
    (verify_data, connection, callback) => {

      let getInviteUserQuery =
      `
      SELECT *
      FROM user
      WHERE user_id = ?
      `;

      connection.query(getInviteUserQuery, [verify_data.user_id], (err, data) => {
        if(err) {
          res.status(500).send({
            status: false,
            message: "500 error"
          });
          connection.release();
          callback("get invite user err : "+err);
        } else{
          var user_info = {};
          user_info.user_invite = data[0].user_invite;

          res.status(200).send({
            status : true,
            message : "successful check invitation",
            result : user_info
          });
          connection.release();
          callback(null,"successful check invitation");
        }
      });
    }
  ];
  async.waterfall(taskArray , (err, result)=> {
		if(err) console.log(err);
		else console.log(result);
	});
});


// 개인별 초대 수락
router.get('/accept',(req, res)=>{

  var tmp_users; // study_users에 담을 배열 (JSON.stringify 해서 담아야 함.)

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
          callback(null, verify_data, connection);
        }
      });
    },
    (verify_data, connection, callback) => {

      let selectArrayQuery =
      `
      SELECT study.study_id, study.study_users
      FROM study, user
      WHERE user.user_study_id = study.study_id and user.user_id = ?
      `;

      // study_users 배열 가져오기
      connection.query(selectArrayQuery, [verify_data.user_id], (err, data) => {
        if(err) {
          res.status(500).send({
            status: false,
            message: "500 error"
          });
          connection.release();
          callback("select users array err : "+err);
        } else{
          tmp_users = JSON.parse(data[0].study_users);
          tmp_users.push(verify_data.user_id);
          callback(null, data, verify_data, connection);
        }
      });
    },
    (data, verify_data, connection, callback) => {
      let selectArrayQuery =
      `
      UPDATE study
      SET study_users = ?
      WHERE study_id = ?
      `;

      // study_users 업데이트
      connection.query(selectArrayQuery, [JSON.stringify(tmp_users), data[0].study_id], (err, data2) => {
        if(err) {
          res.status(500).send({
            status: false,
            message: "500 error"
          });
          connection.release();
          callback("update users array err : "+err);
        } else{
          var study_info = {};
          study_info.study_id = data[0].study_id;

          res.status(200).send({
            status : true,
            message : "successful accept invitation",
            result : study_info
          });

          connection.release();
          callback(null,"successful accept invitation");
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
