const jwt = require('jsonwebtoken');
const secretKey = require('../config/secretKey').key;
/*
 Modularize DB Connection
*/

module.exports = {
    // Issue jwt Token
    sign : function(user_id, user_email, user_phone) {
        const options = {
            algorithm : "HS256",
            expiresIn : 60 * 60 * 24 * 100 // 100 days
        };
        //token에 넣을 값
        const payload = {
            "user_id" : user_id,
            "user_email": user_email,
            "user_phone": user_phone
        };

        let token = jwt.sign(payload, secretKey, options);
        return token;
    },
    // Check jwt
    verify : function(token) {
        let decoded;
        try {
            decoded = jwt.verify(token, secretKey);
            if(!decoded) {
                return -1;
            }else {
                return decoded;
            }
        }
        catch(err) {
            if(err.message === 'jwt expired') console.log('expired token');
            else if(err.message === 'invalid token') console.log('invalid token');
        }
    }
};
