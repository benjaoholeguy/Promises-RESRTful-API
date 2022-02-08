/*
*
* Library for managing the data base
*
*/

// Dependencies
const mongodb = require("mongodb");
const MongoClient = mongodb.MongoClient;
const connectionURL = 'mongodb://root:root@mongo:27017';
const dbName = 'test';

 // Create a new MongoClient
//  const client = new MongoClient(connectionURL);


// Container for the module to be exported
var lib = {};

// Connect to a database
lib.connect = ()=>{
    return new Promise((resolve, reject) => {
        MongoClient.connect(connectionURL,{useNewUrlParser:true}, (error,client) => {

            if(error){
                console.log(error);
                reject(error);
                            
            }else{
                const db = client.db(dbName);
                // db.collection('users').insertOne({
                //         'name':'Benjamin',
                //         'age':49
                //     })
    
                resolve(db);
            }
        })
      })
};

lib.selectDB = async (dbName)=>{
    try {
        // Connect the client to the server
        await client.connect();
        // Establish and verify connection
        await client.db(dbName).command({ ping: 1 });
        console.log("Connected successfully to server");
      } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
      }
}

// Export the module
module.exports = lib;