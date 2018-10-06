const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');

// 진행 중 일정 조회
router.get('/',(req, res)=>{

  var user_id;

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

      // 오늘 날짜보다 뒤인 일정 정보와 유저들 가져오기
      let getPlanQuery =
      `
      SELECT plan.plan_id, plan.plan_name, plan.plan_date, plan.plan_place, study.study_users
      FROM plan, study
      WHERE plan.plan_study_id = study.study_id and study.study_id
      `
      connection.query(getPlanQuery, verify_data.user_id, (err, study_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          study_users = JSON.parse(study_data[0].study_users);
          user_id = study_users[user_idx];

          callback(null,study_data,verify_data,connection);
        }
      });
    },

    (study_data, verify_data, connection, callback) => {

      // 유저 정보 가져오기
      let getUserQuery =
      `
      SELECT user_name, user_img, user_level, user_att_cnt, user_hw_cnt
      FROM user
      WHERE user_id = ?
      `
      connection.query(getUserQuery, user_id, (err, user_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{

          var result_info = {};

          result_info.user_name = user_data[0].user_name;
          result_info.user_img = user_data[0].user_img;
          result_info.user_level = user_data[0].user_level;
          result_info.user_att_cnt = user_data[0].user_att_cnt;
          result_info.user_hw_cnt = user_data[0].user_hw_cnt;

          res.status(200).send({
            status : true,
            message : "successful get personal graph",
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
