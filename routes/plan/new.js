const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');

// 일정 잡기
router.post('/:study_id',(req, res)=>{

  var id = req.params.study_id;
  var name = req.body.plan_name;
  var time = req.body.plan_time;
  var place = req.body.plan_place;
  var date = req.body.plan_date;
  var memo = req.body.plan_memo;

  let taskArray = [
    (callback) => {
      pool.getConnection((err, connection) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          callback("DB connection err : " + err);
        } else{
            callback(null,connection);
        }
      });
    },
    (connection, callback) => {

      let newPlanQuery =
      `
      INSERT INTO plan values(?,?,?,?,?,?,?)
      `;

      // plan insert
      connection.query(newPlanQuery, [null,id,name,date,time,place,memo], (err, data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("make new plan fail : " + err);
        } else{
          callback(null,data,connection);
        }
      });
    },

    // study 테이블의 study_hws Array와 plan 테이블의 plan_id 가져오기
    (data, connection, callback) => {

      let hwsArrayQuery =
      `
      SELECT study.study_hws, plan.plan_id
      FROM study, plan
      WHERE study.study_id = ? and study.study_id = plan.plan_study_id
      `;

      connection.query(hwsArrayQuery, id, (err, data2) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("get hws array : " + err);
        } else{
          callback(null,data,data2,connection);
        }
      });
    },

    // 가져온 study_hws 배열에 plan_id 추가
    (data, data2, connection, callback) => {
      var temp_hws;
      temp_hws = JSON.parse(data2[0].study_hws);
      temp_hws.push(data2[data2.length - 1].plan_id);

      let updateHwsQuery =
      `
      UPDATE study
      SET study_hws = ?
      WHERE study_id = ?
      `;
      connection.query(updateHwsQuery, [JSON.stringify(temp_hws), id], (err, data3) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("500 : " + err);
        } else{
          var planInfo = {};
          planInfo.plan_id = data2[data2.length - 1].plan_id;
          res.status(200).send({
            status : true,
            message : "successful make plan",
            result : planInfo
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
