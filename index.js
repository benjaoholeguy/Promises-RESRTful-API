/*
* Primary file for the API
*
*
*/

// Dependencies
const server = require('./lib/server.js');
const workers = require('./lib/workers.js');
const os = require('os');

// Declare the app
let app = {};

// Initialize
app.init = ()=>{
    // Start the server
    server.init();

    // Start the workers
    workers.init();

    for (let i = 0; i < os.cpus().length; i++){
        console.log(os.cpus());
    }
};

// Execute
app.init();

// Export the app
module.exports = app;