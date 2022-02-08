/*
*
* Helpers for various tasks
*
*/

// Dependencies
var crypto = require('crypto');
var config = require('./config');
const https = require('https');
const querystring = require('querystring'); 
const path = require('path');
const fs = require('fs');

// Container for all the helpers
let helpers = {};

// Create a SHA256 hash
helpers.hash = (str)=>{
    if(typeof(str) == 'string' && str.length > 0){
        let hash = crypto.createHmac('sha256',config.hashingSecret).update(str).digest('hex');
        return hash;
    }else{
        return false;
    }
};

// Parse a Json string to an object in all cases, without throwing
helpers.parseJsonToObject = (str) => {
    try{
        let obj = JSON.parse(str);
        return obj;
    }catch(e){
        return {};
    }
};

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = (strLength) => {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if(strLength){
        // Define all the possible characters that could go into a string
        let possibleCharacers = 'abcdefghijklmnopqrstuvwxyz0123456789';

        let str = '';
        for(i=1; i <= strLength; i++){
            // Get a random character from the possibleCharacters string
            let randomCharacter = possibleCharacers.charAt(Math.floor(Math.random() * possibleCharacers.length));
            // Append this character to the final string
            str+=randomCharacter;
        }

        // Return the final string
        return str;
    }else{
        return false;
    }
};





// helpers.sendTwilioSms = (phone,msg) => {
//     return new Promise((resolve,reject) => {
//         phone = typeof(phone) == 'string' && phone.trim().length > 10 ? phone.trim() : false;
//         msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;
//         if(phone && msg){
//             // Configure the request payload
//             let payload = {
//                 'From' : config.twilio.fromPhone,
//                 'To' : '+64'+phone,
//                 'Body' : msg
//             }

//             // Stringify the payload
//             let stringPayload = querystring.stringify(payload);

//             // Configure the request details
//             let requestDetails = {
//                 'protocol' : 'https:',
//                 'hostname' : 'api.twilio.com',
//                 'method' : 'POST',
//                 'path' : `/2010-04-01/Accounts${config.twilio.accountSid}/Messages.json`,
//                 'auth' : `${config.twilio.accountSid}:${config.twilio.authToken}`,
//                 'headers' : {
//                     'Content-Type' : 'application/x-www-form-urlencoded',
//                     'Content-Length' : Buffer.byteLength(stringPayload)
//                 }

//             };

//             // Instantiate the request object
//             let req = https.request(requestDetails,(res)=>{
//                 // console.log(requestDetails)
//                 // Grab the status of the sent request
//                 let status = res.statusCode;
//                 // Callback successfully if the request went through
//                 if(status==200 || status==201){
//                     resolve({'statusCode':'200','payload':'Ok'});
//                 }else{
//                     reject({'statusCode':'404','payload':`Status code was ${status}`});
//                 }
//             });

//             // Bind to the error event so it doesn't get thrown
//             req.on('error',(e)=>{
//                 reject({'statusCode':'500','payload':`Error ${e}`});
//             })
//             // Add the payload to the request
//             req.write(stringPayload);
//             // End the request
//             req.end();
//         }else{
//             reject({'statusCode':'404','payload':'Twilio error. Given parameters were missing of invalid'});
//         }

//     });
// };


helpers.getTemplate = (templateName) => {
    return new Promise((resolve,reject) => {
        templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
        if (templateName){
            let templateDirectory = path.join(__dirname,'/../templates/');
            fs.promises.readFile(`${templateDirectory}${templateName}.html`,'utf-8')
            .then(str => {
                resolve(str);
            })
            .catch(err => {
                reject(err);
            })
        }else{
            reject();
        }
    });
}


// Export the helpers
module.exports = helpers;