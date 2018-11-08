const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');
const moment = require

// 스터디 나가기
router.delete('/',(req, res)=>{

  var user_id;
  var study_id;
  var study_users;

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
      connection.query(getUserInfo, user_id, (err, user_all_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          // 등록된 스터디가 없다면
          if(user_all_data[0].user_study_id == null){
            res.status(200).send({
              status : true,
              message : "there is no study"
            });
            connection.release();
          }
          else{
            study_id = user_all_data[0].user_study_id;
            callback(null,user_all_data,connection);
          }
        }
      });
    },

    (user_all_data, connection, callback) => {
      let getStudy =
      `
      SELECT *
      FROM study
      WHERE study_id = ?
      `
      connection.query(getStudy, study_id, (err, study_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          study_users = JSON.parse(study_data[0].study_users);
          for(let i = 0; i < study_users.length; i++){
            if(study_users[i] == user_id){
              study_users.splice(i,1);
            }
          }
          callback(null,study_data,connection);
          }
      });
    },

    (study_data, connection, callback) => {
      let updateStudy =
      `
      UPDATE study
      SET study_users = ?
      WHERE study_id = ?
      `
      connection.query(updateStudy, [JSON.stringify(study_users), study_id], (err, data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          callback(null,data,connection);
        }
      });
    },

    (data, connection, callback) => {
      let deleteStudy =
      `
      UPDATE user
      SET user_study_id = null
      WHERE user_id = ?
      `
      connection.query(deleteStudy, user_id, (err, user_data) => {
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
            message : "successful study out"
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
