/**
 * 
 * Server-related tasks
 */
// Dependencies
const http = require('http');
const https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');

var fs = require('fs');
let handlers = require('./handlers');
let helpers = require('./helpers');
let path = require('path');

var util = require('util');
var debug = util.debuglog('server');

// Instantiate the server module object
let server = {};

// const accountSid = config.twilio.accountSid;
// const authToken = config.twilio.authToken;
// const client = require('twilio')(accountSid,authToken); 

// client.messages
//   .create({
//      body: 'This is the ship that made the Kessel Run in fourteen parsecs?',
//      from: '+19377447718',
//      to: '+642108895013'
//    })
//   .then(message => console.log('All good, message id: ',message.sid))
//   .catch((err)=>{
//         console.log(err);
//     });



// @TODO GET RID OF THIS
// helpers.sendTwilioSms('+642108895013','Hello!')
// .then(()=>{

//     console.log("ok");
// })
// .catch((err)=>{
//     console.log(err);
// });

// TESTING
// @TODO delete this
// _data.create('test','newFile',{'foo':'bar'})
//     .then((data)=>{console.log('file created successfully',data)})
//     .catch((err) => {console.log('this was the err',err)});
// _data.read('test','newFile1')
//     .then((data)=>{console.log('this is the file: ',data)})
//     .catch((err) => {console.log('this was the err: ',err)});
// _data.update('test','newFile',{'fizz':'buzz'})
//     .then((data)=>{console.log('file created successfully',data)})
//     .catch((err) => {console.log('this was the err',err)});
// _data.delete('test','newFile')
//     .then((data)=>{console.log('file deleted successfully',data)})
//     .catch((err) => {console.log(err)});

    

// Instantiate the HTTP Server
server.httpServer = http.createServer((req,res) => {
    server.unifiedServer(req,res);
});

// Instantiate the HTTPS Server
server.httpsServerOptions = {
    'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem')),
};

server.httpsServer = https.createServer(server.httpsServerOptions,(req,res) => {
    server.unifiedServer(req,res);
});

// All the server logic for both the http and https server
server.unifiedServer = (req,res)=>{
    // Get the url and parse it
    var parsedUrl = url.parse(req.url,true);

    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g,'');

    // Get the query string as an object
    var queryStringObject = parsedUrl.query;

    // Get the HTTP Method
    var method = req.method.toLowerCase();

    // Get the headers as an object
    var headers = req.headers;
   
    // Get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data',(data) => {
        buffer += decoder.write(data);
    });

    req.on('end', () => {
        buffer += decoder.end();
        // Choose the handler this request should go to. If one is not found, use the notFound handler
        var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;
        // Construct the data object to send to the handler
        var data = {
            'trimmedPath' : trimmedPath,
            'queryStringObject' : queryStringObject,
            'method' : method,
            'headers' : headers,
            'payload' : helpers.parseJsonToObject(buffer)
        };
        chosenHandler(data)
        .then((obj)=>{
            // Determine the type of response
            obj.contentType = typeof(obj) == 'object' && typeof(obj.contentType) == 'string' ? obj.contentType : 'json';
            // Use the status code called back by the handler, or default to 200
            obj.statusCode = typeof(obj) == 'object' && typeof(obj.statusCode) == 'number' ? obj.statusCode : 200;
           
            
            // Return the response parts that are content-specific
            let payloadString = '';
            if(obj.contentType == 'json'){
                res.setHeader('Content-Type','application/json');
                // Use the payload called back by the handler, or default to an empty object
                obj.payload = typeof(obj.payload) == 'object' ? obj.payload : {};
                // Convert the payload to a string
                payloadString = JSON.stringify(obj.payload);
            }else if(obj.contentType == 'html'){
                res.setHeader('Content-Type','text/html');
                payloadString = typeof(obj.payload) == 'string' ? obj.payload : '';
            }
            // Return the response-parts that are common to all content-types
            res.writeHead(obj.statusCode);
            res.end(payloadString);
            // If the response is 200 print green, otherwise print red            
            debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+obj.statusCode);         
        })
        .catch((err)=>{
            // If the response is not 200 print green, otherwise print red
            debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+err.statusCode);
            // Log the request path
            var payloadString = JSON.stringify(err.payload);
            // Return the response
            res.setHeader('Content-Type','application/json');
            res.writeHead(err.statusCode);
            res.end(payloadString);
        })
     })
};

// Define a request router
server.router = {
    '' : handlers.index,
    'account/create' : handlers.accountCreate,
    'account/edit' : handlers.accountEdit,
    'account/deleted' : handlers.accountDeleted,
    'session/create' : handlers.sessionCreate,
    'session/deleted' : handlers.sessionDeleted,
    'checks/all' : handlers.checkList,
    'checks/create' : handlers.checksCreate,
    'checks/edit' : handlers.checksEdit,
    'ping' : handlers.ping,
    'api/users' : handlers.users,
    'api/tokens' : handlers.tokens,
    'api/checks' : handlers.checks,
    'db' : handlers.db
}

// Init script
server.init = ()=>{
    // Start the HTTP server
    server.httpServer.listen(config.httpPort,() => {
        console.log('\x1b[36m%s\x1b[0m','This is server is running on port '+config.httpPort);
    });
    // Start the HTTPS Server
    server.httpsServer.listen(config.httpsPort,() => {
        console.log('\x1b[37m%s\x1b[0m','This is server is running on port '+config.httpsPort);
    });
}

// Export the server
module.exports = server;

