/**
 * 
 * Worker-related tasks
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
// const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');
var util = require('util');
var debug = util.debuglog('workers');



var config=require('./config');
const accountSid = config.twilio.accountSid;
const authToken = config.twilio.authToken;
const client = require('twilio')(accountSid,authToken); 

// Instantiate the worker object
let workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = () => {
    // Get all the checks that exists in the system
    _data.list('checks')
    .then((checks)=>{
        // console.log('estos son los checks: ' + checks)
        // if(checks && checks.length > 0){
            checks.forEach(check => {
                // Read in the check data
                _data.read('checks',check)
                .then((originalCheckData)=>{
                    // console.log(originalCheckData);
                    // Pass the data to the check validator and let that function continue or log errors as needed
                    workers.validateCheckData(originalCheckData);
                })
                .catch((err)=>{
                    debug('Error reading one of the check\'s data');
                })
            });
        // }else{
        //     console.log('Error: could not find any check to process');
        // }
    })
    .catch((error)=>{
        debug(`Could not find any check to process:  ${error}`);
    });
};

// Sanity-check the check-data
workers.validateCheckData = (originalCheckData) => {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData !== null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length > 10 ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['http','https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['get','post','put','delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
    originalCheckData.successCodes = typeof(originalCheckData.successCodes) == 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    // set the keys that may not be set (if the workers have never seen this check before)
    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up','down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    // console.log(originalCheckData)

    // If all the checks pass, pass the data along to the next step in the process
    if(originalCheckData.id && 
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds){
            workers.performCheck(originalCheckData);
        }else{
            debug('Error: one of the checks is not properly formatted');
        }
}

// Perform the check, send the originalCheckData and the outcome of the check process, to the next step in the process
workers.performCheck = (originalCheckData) => {
    // Prepare the initial check outcome
    let checkOutcome = {
        'error' : false,
        'responseCode' : false
    };

    // Mark that the outcome has not been sent yet
    let outcomeSent = false;

    // Parse the hostname and the path out of the original check data
    let parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url,true);
    let hostName = parsedUrl.hostname;
    let path = url.path; //want the full query string

    // Construct the request
    let requestDetails = {
        'protocol' : originalCheckData.protocol+':',
        'hostname' : hostName,
        'method' : originalCheckData.method.toUpperCase(),
        'path' : path,
        'timeout' : originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate the request object (using either the http or https module)
    let _moduleToUse = originalCheckData.protocol == 'http' ? http : https;

    let req = _moduleToUse.request(requestDetails,((res)=>{
        // Grab the status of the sent request
        let status = res.statusCode;

        // Update the checkOutcome and pass the data along
        checkOutcome.responseCode = status;

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome);
            outcomeSent = true;

        }

    }));

    // Bind to the error event so it doesnt get thrown
    req.on('error',(err)=>{
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error' : true,
            'value' : err,
        };
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the timeout event
    req.on('timeout',(err)=>{
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error' : true,
            'value' : 'timeout',

        };
        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData,checkOutcome);
            outcomeSent = true;
        }
    });

    // End the request
    req.end();

};

// Process the checkoutcome, update the check data as needed, trigger an alert if needed
workers.processCheckOutcome = (originalCheckData,checkOutcome) => {
    // Decide if the check is considered up or down
    let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
    // Decide if an alert is warranted
    let alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Log the outcome
    let timeOfCheck = Date.now();
    // console.log(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck);
    workers.log(originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck);

    // Update the check data
    let newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = timeOfCheck;

    // console.log('checkOutcome: ',checkOutcome, ' state: ',state,' alertWarranted: ',alertWarranted);


    // Save the updates to disk
    _data.update('checks',newCheckData.id,newCheckData)
    .then((data)=>{
        // Send the new check data to the next phase in the process if needed
        if (alertWarranted){
            workers.alertUserToStatusChange(newCheckData);
        }else{
            debug('Check output has not changed, no alert needed');
        }
    })
    .catch((err) => {
        debug(`Error trying to save one of the checks: ${newCheckData.id}. Error: ${err}`);
    }); 
}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = (newCheckData) => {
    let msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`
    client.messages
    .create({
        // body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
        body: msg,
        from: '+19377447718',
        // to: '+642108895013'
        to: newCheckData.userPhone
    })
    .then((message) => {
        debug('All good, message id: ',message.sid,'Success: User was alerted to a status change in their check, via sms: ', msg);
    })
    .catch((err)=>{
        debug(`Error: could not send sms alert to user who had a state change in their check ${err}\n Message: ${msg}`);
    });
};


workers.log = (originalCheckData,checkOutcome,state,alertWarranted,timeOfCheck) => {
    // Form the log data
    let logData = {
        'check' : originalCheckData,
        'outcome' : checkOutcome,
        'state' : state,
        'alert' : alertWarranted,
        'time' : timeOfCheck
    };
    // Convert data to a string
    let logString = JSON.stringify(logData);
    // Determine the name of the log file
    let logFileName = originalCheckData.id;
    // Append the log string to the file
    _logs.append(logFileName,logString)
    .then(()=>{
        debug('Logging to the file succeded.');
    })
    .catch((err)=>{
        debug("Logging to the file failed, with this error: ",err);
    })
};

// Timer to execute the worker process once per minute
workers.loop = ()=>{
    setInterval(()=>{
        workers.gatherAllChecks();
    },1000 * 60);
};

// Rotate (compress) the log files
workers.rotateLogs = () => {
    // Listing all (non-compressed) log files
    _logs.list(false)
    .then((logs)=>{
        logs.forEach((logName)=>{
            // Compress the data to a different file
            let logId = logName.replace('.log','');
            let newFileId = `${logId}-${Date.now()}`;
            _logs.compress(logId,newFileId)
            .then(()=>{
                // Truncate the log
                _logs.truncate(logId)
                .then(()=>{
                    debug('Success truncating logFile');
                })
                .catch((error)=>{
                    debug('Error truncating one of the log files: ', error);
                })
            })
            .catch((error)=>{
                debug('Error compressing one of the log files: ', error);
            })
        })
    })
    .catch((error)=>{
        debug(error);
    })
}

// Timer to execute the log rotation process once per day
workers.logRotationLoop = () => {
    setInterval(()=>{
        workers.rotateLogs();
    },1000 * 60 * 60 * 24);
}


// Init script
workers.init = ()=>{

    // Send to console in yellow
    console.log('\x1b[33m%s\x1b[0m','Background workers are running');

    // Execute all the checks immidiately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute leter on
    workers.loop();

    // Compress all the logs
    workers.rotateLogs();

    // Call the compression loop so logs will be compressed later on
    workers.logRotationLoop();
};

// Export
module.exports = workers;