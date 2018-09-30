const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');

// 로그인
router.post('/',(req, res)=>{

  var token; // 넘겨줄 토큰 값

  let taskArray = [
    (callback) => {
      pool.getConnection((err, connection) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 Error"
          });
          callback("DB connection err : " + err);
        } else callback(null, connection);
      });
    },
    (connection,callback) => {
      var postIDQuery =
      `
      SELECT *
      FROM user
      WHERE user_name = ? and user_email = ?
      `;
      connection.query(postIDQuery, [req.body.user_name,req.body.user_email], (err, data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("sign in error : " + err);
        } else{
          callback(null, data, connection);
        }
      });
    },
    (data, connection, callback) => {
      // 데이터가 없을 시
      if(data.length == 0){
          res.status(400).send({
            status : false,
            message : "there is no user"
          });
          // connection.release();
          // callback("sign in error : " + err);
      }else{ // 이미 회원가입 된 회원일 시 => 토큰 새로 발급
        var userInfo = {};

        token = jwt.sign(data[0].user_id, data[0].user_email, data[0].user_phone);
        userInfo.user_token = token;
        res.status(201).send({
          status : true,
          message : "successful sign in",
          result : userInfo
        });
        connection.release();
        callback(null,"successful sign in");
      }
    }
  ];
  async.waterfall(taskArray , (err, result)=> {
      if(err) console.log(err);
      else console.log(result);
   });
});

module.exports = router;
