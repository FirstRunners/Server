const express = require('express');
const router = express.Router();
const async = require('async');
const pool = require('../../config/dbPool.js');
const jwt = require('../../module/jwt.js');

// 회원가입
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
      WHERE user_name = ? and user_email = ? and user_phone = ?
      `;
      connection.query(postIDQuery, [req.body.user_name,req.body.user_email,req.body.user_phone], (err, data) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("post id err : " + err);
        } else{
          callback(null, data, connection);
        }
      });
    },
    (data, connection, callback) => {
      let signupQuery =
      `insert into user values(?,?,?,?,?,?,?,?,?,?,?)`;
      // 데이터가 없을 시 (새로 가입하는 회원일 시) => DB에 insert 후 토큰 발급
      if(data.length == 0){
        // DB에 insert
        connection.query(signupQuery, [null,req.body.user_name,req.body.user_email,req.body.user_phone,null,null,1,0,0,null,1],(err, data2) => {
          if(err){
            res.status(500).send({
              status : false,
              message : "500 error"
            });
            connection.release();
            callback("sign up err : " + err);
          } else{
            callback(null,connection);
          }
        });
      }else{ // 이미 회원가입 된 회원일 시 => 로그인 해야함
          res.status(200).send({
            status : false,
            message : "there is a existing user"
          });
          connection.release();
      }

    },
    (connection, callback) => {
      let selectUserQuery =
      `SELECT *
       FROM user
       WHERE user_name = ? and user_email = ? and user_phone = ?
       `;
       // user_id 까지 찾아서 토큰 발급
      connection.query(selectUserQuery, [req.body.user_name,req.body.user_email,req.body.user_phone], (err, data3) => {
        if(err){
          res.status(500).send({
            status : false,
            message : "500 error"
          });
          connection.release();
          callback("select user error : " + err);
        } else{
          if(data3.length == 0){
            es.status(500).send({
              status : false,
              message : "500 error"
            });
            connection.release();
            callback("user data null : " + err);
          }else{
            var userInfo = {};

            token = jwt.sign(data3[0].user_id, data3[0].user_name, data3[0].user_email, data3[0].user_phone);
            userInfo.user_token = token;
            res.status(200).send({
              status : true,
              message : "successful sign up",
              result : userInfo
            });
            connection.release();
            callback(null,"successful insert user");
          }

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
