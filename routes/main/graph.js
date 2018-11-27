const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');
const moment = require

// 그래프 메인 화면
router.get('/',(req, res)=>{

  var study_id;
  var user_id;
  var user_in_flag;
  var study_users;
  var new_users = []; // study_user 배열 업데이트 시에 넣어줄 배열
  var user_infos = []; // 클라에게 보내 줄 유저 객체 배열
  var user_me;
  var user_img;
  var period;
  var study_day; // 오늘 - 스터디 시작 날
  var study_day_goal; // 스터디 끝나는 날 - 오늘
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
          console.log("study_ID_data[0]: ",study_ID_data[0]);
          console.log("스터디 아이디: ",study_id);
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
              if(user_id == study_users[u]){
                user_in_flag = true;
                break;
              }
              else{
                if(u == study_users.length -1) user_in_flag = false;
                else continue;
              }
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
              period = study_data[0].study_period;

              var tmp_start = new Date(study_data[0].study_start);
              var tmp_end = new Date(study_data[0].study_end);

              // study_day, study_day_goal 계산
              if(((today.getTime() - tmp_start.getTime()) / (1000*60*60*24)) >= period) study_day = period;
              else study_day = (today.getTime() - tmp_start.getTime()) / (1000*60*60*24);

              if(tmp_end.getTime() <= today.getTime()) study_day_goal = 0;
              else  study_day_goal = (tmp_end.getTime() - today.getTime()) / (1000*60*60*24);

              callback(null,study_data,verify_data,connection);
            }

          }
        });
      }

    },

    (study_data, verify_data, connection, callback) => {

      // 유저 정보 가져오기
      let getUserQuery =
      `
      SELECT user_id, user_name, user_img, user_att_cnt, user_hw_cnt
      FROM user
      WHERE user_id in (?)
      `
      connection.query(getUserQuery, [study_users], (err, user_data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          // user_id, user_name, user_att_cnt, user_hw_cnt 빼오기
          var tmp_users = {};
          var info = [];

          for(let c=0; c<user_data.length; c++){
            var user_info = {};
            user_info.user_id = user_data[c].user_id;
            user_info.user_name = user_data[c].user_name;
            user_info.user_img = user_data[c].user_img;
            user_info.user_att_cnt = user_data[c].user_att_cnt;
            user_info.user_hw_cnt = user_data[c].user_hw_cnt;
            info.push(user_info);
          }
          tmp_users.info = info;

          // 출석횟수 내림차순 정렬
          tmp_users.info.sort(function (a,b) {
            return a.user_att_cnt > b.user_att_cnt ? -1 : a.user_att_cnt < b.user_att_cnt ? 1 : 0;
          });

          // 내림차순 정렬 한 결과 새로 insert할 유저 배열과 클라에게 보내줄 유저 정보 배열 만들기
          for(let idx=0; idx<tmp_users.info.length; idx++){

            if(tmp_users.info[idx].user_id == user_id){
              user_me = idx;
              user_img = tmp_users.info[idx].user_img;
            }

            new_users.push(tmp_users.info[idx].user_id);

            var tmp_info = {};
            tmp_info.user_idx = idx;
            tmp_info.user_name = tmp_users.info[idx].user_name;
            tmp_info.user_att_cnt = tmp_users.info[idx].user_att_cnt;
            tmp_info.user_hw_cnt = tmp_users.info[idx].user_hw_cnt;
            tmp_info.user_img = tmp_users.info[idx].user_img;
            user_infos.push(tmp_info);
          }

          // ========================================================================================
          // study_users에 insert
          let updateStudyQuery =
          `
          UPDATE study
          SET study_users = ?
          WHERE study_id = ?
          `;
          connection.query(updateStudyQuery, [JSON.stringify(new_users),study_id], (err, update_data) => {
            if(err){
              res.status(500).send({
                status : false,
                message : "500 error"
              });
              connection.release();
              callback("update study users fail : " + err);
            } else{
              var result_info = {};
              result_info.study_id = study_data[0].study_id;
              result_info.study_day = study_day;
              result_info.study_day_goal = study_day_goal;
              result_info.study_goal = study_data[0].study_goal;

              if(study_day == 0) result_info.study_percent = 0;
              else result_info.study_percent = (Math.floor((study_day/period)*100));


              result_info.study_count = study_data[0].study_count;
              result_info.study_users = user_infos;
              result_info.user_me = user_me;
              result_info.user_img = user_img;

              res.status(200).send({
                status : true,
                message : "successful get main graph",
                result : result_info
              });
              connection.release();
            }
          });
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
