const http = require('http');
const html = require('html');
const express = require('express');
const router = express.Router();
const fs = require('fs');

router.get('/', (req, res)=>{
  fs.readFile('./static/invitation.html',function(error, data){
    if(error){
      console.log(error);
    }else{
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.end(data);
    }
  });
});

module.exports = router;
