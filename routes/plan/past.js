const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');
const moment = require

// 지난 일정 조회
router.get('/',(req, res)=>{

  var study_id;
  var user_id;
  var study_users;
  var user_in_flag; // study_users에 유저가 있는지
  var study_users_cnt; // 스터디 인원
  var plan_id = []; // 해당 스터디의 일정 아이디 배열
  var hw_flag = []; // plan_id마다 hw를 했는지
  var plan_date = []; // plan_date 배열
  var plan_attend = []; // plan_date별 참석인원 수 배열
  var new_plan = []; // 날짜에 맞는 plan 배열
  var today = new Date();

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

      // 초대장도 받지 않은 경우
      if(study_id == null){
        res.status(200).send({
          status : true,
          message : "there is no study",
          result : null
        });
        connection.release();
      }

      // 초대장은 받은 경우
      else{
        // 스터디 정보 가져오기
        let getStudyInfoQuery =
        `
        SELECT *
        FROM study
        WHERE study_id = ?
        `
        connection.query(getStudyInfoQuery, study_id, (err, study_data) => {
          if(err){
            res.status(500).send({
              status : false,
              message : "500 error"
            });
            connection.release();
            callback("500 : " + err);
          } else{

            // study user id 배열 만들기
            study_users = JSON.parse(study_data[0].study_users);

            // user가 초대장만 받고 수락하지 않은 상태인지 체크
            for(let u=0; u<study_users.length; u++){
              if(study_users.indexOf(user_id) == -1) user_in_flag = false;
              else user_in_flag = true;
            }
            // 초대장 수락하지 않은 상태일 때
            if(user_in_flag == false){
              res.status(200).send({
                status : true,
                message : "there is no study",
                result : null
              });
              connection.release();
            }
            // 초대장 수락한 상태일 때
            else{
              callback(null,study_data,verify_data,connection);
            }
          }
        });
      }

    },

    (study_data, verify_data, connection, callback) => {

      let getPlanInfoQuery =
      `
      SELECT plan.plan_id, plan.plan_name, plan.plan_date, plan.plan_place, study.study_users
      FROM plan, study
      WHERE plan.plan_study_id = study.study_id and plan.plan_study_id = ?
      `;
      connection.query(getPlanInfoQuery, study_id, (err, plan_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          // 지난 일정인 것들만 new_plan에 저장 & plan_id , plan_date 저장
          for(let p=0; p<plan_data.length; p++){
            var tmp_plan_date = new Date(plan_data[p].plan_date);
            if(tmp_plan_date.getTime() < today.getTime()){
              new_plan.push(plan_data[p]);
              plan_id.push(plan_data[p].plan_id);
              plan_date.push(plan_data[p].plan_date);
            }else{
              continue;
            }
          }

          // 스터디 인원
          study_users_cnt = JSON.parse(plan_data[0].study_users).length;

          callback(null,plan_data,study_data,verify_data,connection);
        }
      });
    },

    (plan_data, study_data, verify_data, connection, callback) => {

      let getHWInfoQuery =
      `
      SELECT *
      FROM homework
      WHERE hw_user_id = ?
      `;
      connection.query(getHWInfoQuery, user_id, (err, hw_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          if(hw_data.length == 0){
            for(let w=0; w<plan_id.length; w++){
              hw_flag[w] = 0;
            }
          }
          else{
            for(let h=0; h<plan_id.length; h++){
              if(hw_data[h] == null){
                hw_flag[h] = 0;
              }
              else{
                var idx = plan_id.indexOf(hw_data[h].hw_plan_id);
                if(idx == -1){
                  hw_flag[h] = 0;
                }
                else{
                  hw_flag[idx] = 1;
                }
              }
            }
          }

          callback(null,hw_data,plan_data,study_data,verify_data,connection);
        }
      });
    },

    (hw_data, plan_data, study_data, verify_data, connection, callback) => {

      let getAttendQuery =
      `
      SELECT *
      FROM plan, attendance, study
      WHERE plan.plan_study_id = study.study_id
        and study.study_id = attendance.att_study_id
        and plan.plan_study_id = attendance.att_study_id
        and attendance.att_check_date = plan.plan_date
        and attendance.att_check_date in (?) and plan.plan_date in (?)
      `;
      connection.query(getAttendQuery, [plan_date, plan_date], (err, attend_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          var result_info = {};
          result_info.study_id = study_id;

          var result_plans = [];
          for(let rdx=0; rdx<new_plan.length; rdx++){
            var plan_info = {};
            plan_info.plan_id = plan_id[rdx];
            plan_info.plan_name = new_plan[rdx].plan_name;
            plan_info.plan_date = new_plan[rdx].plan_date;
            plan_info.plan_place = new_plan[rdx].plan_place;
            plan_info.study_users = study_users_cnt;

            var tmp_cnt = 0;
            for(let adx=0; adx<attend_data.length; adx++){
              if(new_plan[rdx].plan_date == attend_data[adx].att_check_date){
                tmp_cnt += 1;
              }else continue;
            }
            plan_info.study_attend = tmp_cnt;
            plan_info.hw_flag = hw_flag[rdx];
            result_plans.push(plan_info);
          }
          result_info.study_plans = result_plans;

          res.status(200).send({
            status : true,
            message : "successful get now plan",
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
