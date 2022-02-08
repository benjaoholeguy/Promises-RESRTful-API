/*
*
* Request handlers
*
*/

// Dependencies
let _data = require('./data');
let _db = require('./db');
let helpers = require('./helpers');
let config = require('./config');


// Define the handlers
var handlers = {};

/**
 * 
 * Html handlers
 * 
 */

// Index handler
handlers.index = (data) => {
    return new Promise((resolve,reject) => {
        if(data.method=='get'){
            helpers.getTemplate('index')
            .then((str)=>{
                
                resolve({'statusCode':'200','payload': str,'contentType':'html'});

            })
            .catch(()=>{
                reject({'statusCode':'500','payload' : undefined,'contentType':'html'});
            });
        }else{
            reject({'statusCode':'405','payload' : undefined,'contentType':'html'});
        }
    });
};

/**
 * 
 * Json API handlers 
 * 
 */

// Users
handlers.users = (data)=>{
    return new Promise((resolve,reject) => {
        let acceptableMethods = ['get','put','post','delete'];
        if(acceptableMethods.indexOf(data.method) > -1){
            handlers._users[data.method](data)
            // handlers._users.post(data)
            .then((data)=>{
                console.log(data);
                resolve(data);
                
            })
            .catch((err)=>{
                // console.log("reject users");
                reject(err);
            });
        }else{
            reject(405);
        }
    });
};


// Conteiner for the users submethods
handlers._users = {};

// Users - Post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional Data: none
handlers._users.post = (data) => {

    return new Promise((resolve,reject) => {

        // Check that all required fields are filled out
        let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
        let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
        let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length > 10 ? data.payload.phone.trim() : false;
        let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 10 ? data.payload.password.trim() : false;
        let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

        if(firstName && lastName && phone && password && tosAgreement){
            // Make sure that the user doesn't already exist
            _data.read('users',phone)
            .then((data)=>{
                // User already exist
                reject({'statusCode':'400','payload':`A user with phone number ${data.phone} already exist`});
            })
            .catch((err) => {
                // Hash the password
                let hashedPassword = helpers.hash(password);
                // Create the user Object
                if(hashedPassword){
                    let userObject = {
                        'firstName' : firstName,
                        'lastName' : lastName,
                        'phone' : phone,
                        'hashedPassword' : hashedPassword,
                        'tosAgreement' : true
                    };
                    // Store the user
                    _data.create('users',phone,userObject)
                    .then((data) => {
                        resolve({'statusCode':'200','payload':data});
                    })
                    .catch((err) => {
                        reject({'statusCode':'500','payload':'Could not create the new user'});
                    })
                }else{
                    reject({'statusCode':'500','payload':'Could not hash the user\'s password'});
                }   
            });
        }else{
            reject({'statusCode':'400','payload':'Missing required fields'});
        }

    });
};

// Users - Get
// Required data: phone
// Optional data: none
// @TODO Only let an authenticated user access their own object. Don't let them access anyone elses.
handlers._users.get = (data) => {
    return new Promise((resolve,reject) => {
        // Check that the phone number provided is valid
        let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length > 10 ? data.queryStringObject.phone.trim() : false;
        if(phone){
            // Get the token from the headers
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token,phone)
            .then((data) => {
                // Lookup the user
                _data.read('users',phone)
                .then((data)=>{
                    // User exists
                    if(data.phone){
                        // Remove the hash password from the user object before returning to the requester
                        delete data.hashedPassword;
                        resolve({'statusCode':'200','payload':data});
                    }else{
                        reject({'statusCode':'500','payload':'Could not read the user phone'});
                    }
                })
                .catch((err)=>{
                    reject({'statusCode':'404','payload':'User not exists'});
                })
            })
            .catch((err) => {
                reject({'statusCode':'403','payload':'Missing required token in header, or token is invalid'});
            })          
        }else{
            reject({'statusCode':'400','payload':'Missing required field'});
        }
    });
};

// Users - Put
// Required data: phone
// Optional data: firstName, lastName, password (at least 1 must be specified)
// @TODO Only let an authenticated user update their own object. Don't let them access anyone else's.
handlers._users.put = (data) => {
    return new Promise((resolve,reject) => {
        // Check that the phone number provided is valid
        let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length > 10 ? data.payload.phone.trim() : false;

        //  Check for the optional fields
        let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
        let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
        let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 10 ? data.payload.password.trim() : false;
       
        // Error if the phone is invalid
        if(phone){
            // Error if nothing is sent to update
            if(firstName || lastName || password){
                // Get the token from the headers
                let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                // Verify that the given token is valid for the phone number
                handlers._tokens.verifyToken(token,phone)
                .then((data) => {
                    // Lookup the user
                    _data.read('users',phone)
                    .then((data)=>{
                        // Update user fields
                        if(firstName){
                            data.firstName = firstName;
                        }
                        if(lastName){
                            data.lastName = lastName;
                        }
                        if(password){
                            data.password = helpers.hash(password);
                        }
                        // Store the new updates
                        _data.update('users',phone,data)
                        .then((data)=>{resolve({'statusCode':'200','payload':data})})
                        .catch((err) => {
                            reject({'statusCode':'500','payload':'Could not update the user'});
                        });      
                    })
                    .catch((err)=>{
                        reject({'statusCode':'400','payload':'User not exists'});
                    })
                })
                .catch((err) => {
                    reject({'statusCode':'403','payload':'Missing required token in header, or token is invalid'});
                })   
            }else{
                reject({'statusCode':'400','payload':'Missing fields to update'});
            }
        }else{
            reject({'statusCode':'400','payload':'Missing required field'});
        }
    });
};

// Users - Delete
// Required field: phone
// @TODO Only let an authenticated user delete their object. Don't let them delete anyone else's 
// @TODO Cleanup (delete) any other data files asociated with this user
handlers._users.delete = (data) => {
    return new Promise((resolve,reject) => {

        // Check the phone number is valid
        let phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length > 10 ? data.queryStringObject.phone.trim() : false;
        
        if(phone){
            // Get the token from the headers
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
            // Verify that the given token is valid for the phone number
            handlers._tokens.verifyToken(token,phone)
            .then((data) => {
                // Lookup the user
                _data.read('users',phone)
                .then((userData)=>{

                    // console.log(userData)
                    
                    _data.delete('users',phone)
                    .then((data)=>{



                        let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                        let checksToDelete = userChecks.length;
                        // console.log(userChecks)
                        if(checksToDelete > 0){

                            let checksDeleted=0;
                            let delitionErrors=false;

                            // Look through the checks
                            userChecks.forEach(checkId=>{
                                console.log(checkId)
                                // Delete the check
                                _data.delete('checks',checkId)
                                .then((data)=>{
                                    checksDeleted++;
                                    if(checksDeleted==checksToDelete){
                                        resolve({'statusCode':'200','payload':'User and Checks were deleted'});
                                    }
                                    
                                })
                                .catch((err) => {
                                    delitionErrors=true;
                                    reject({'statusCode':'500','payload':`Could not delete the check ${checkId}`})
                                });
                            });

                        }
                        



                        
                    })
                    // .then(()=>{
                    //     let checksDeleted;
                    //     let delitionErrors=false;

                    //     // Look through the checks
                    //     userChecks.forEach(checkId=>{
                    //         // console.log(checkId)
                    //         // Delete the check
                    //         _data.delete('checks',checkId)
                    //         .then((data)=>{
                    //             checksDeleted++;
                    //             console.log('checksDeleted: ',checksDeleted,'checksToDelete: ',checksToDelete)
                    //             if(checksDeleted==checksToDelete){
                    //                 resolve({'statusCode':'200','payload':`Check ${checkId} was deleted`});
                    //             }
                                
                    //         })
                    //         .catch((err) => {
                    //             delitionErrors=true;
                    //             reject({'statusCode':'500','payload':`Could not delete the check ${checkId}`})
                    //         });
                    //     });

                    // })
                    // .then((data)=>{
                    //     if(checksDeleted==checksToDelete){
                    //         resolve({'statusCode':'200','payload':`This check ${checkId} was deleted`});
                    //     }
                    // })
                    .catch((err)=>{reject({'statusCode':'500','payload':'Could not delete the user'})});
                })
                .catch((err)=>{
                    reject({'statusCode':'400','payload':'User not exists'});
                })
            })
            .catch((err) => {
                reject({'statusCode':'403','payload':'Missing required token in header, or token is invalid'});

            }) 
        }else{
            reject({'statusCode':'400','payload':'Missing required field'});
        }      
    });
};

// Tokens
handlers.tokens = (data)=>{
    return new Promise((resolve,reject) => {
        let acceptableMethods = ['get','put','post','delete'];
        if(acceptableMethods.indexOf(data.method) > -1){
            handlers._tokens[data.method](data)
            // handlers._users.post(data)
            .then((data)=>{
                resolve(data);
                
            })
            .catch((err)=>{
                reject(err);
            });
            // console.log(200);
            // resolve(200);
        }else{
            reject(405);
            // callback(405);
        }
    });
};

// Container for all teh tokens methods
handlers._tokens = {};

// Token - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data) => {
    return new Promise((resolve,reject) => {

        let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length > 10 ? data.payload.phone.trim() : false;
        let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 10 ? data.payload.password.trim() : false;

        if(phone && password){
            // Lookup the user
            _data.read('users',phone)
            .then((data)=>{
                // User exists
                if(data.phone){
                    // Hash the sent password, and compare it to the password stored in the user object
                    let hashedPassword = helpers.hash(password);
                    if(hashedPassword==data.hashedPassword){
                        // if valid, create a new token with a random name. Set expiration date 1 hour in the future
                        let tokenId = helpers.createRandomString(20);
                        let expires = Date.now() + 1000 * 60 * 60;
                        let tokenObject = {
                            'phone':phone,
                            'id':tokenId,
                            'expires':expires
                        };

                        // Store the token
                        _data.create('tokens',tokenId,tokenObject)
                        .then((data) => {
                            resolve({'statusCode':'200','payload':data});
                        })
                        .catch((err) => {
                            reject({'statusCode':'500','payload':'Could not create the new token'});
                        })

                    }else{
                        reject({'statusCode':'400','payload':'Password provided did not match the user\'s password'});
                    }
                }else{
                    reject({'statusCode':'500','payload':'Could not read the user phone'});
                }

            })
            .catch((err)=>{
                reject({'statusCode':'404','payload':'User not exists'});
            })
            
        }else{
            reject({'statusCode':'400','payload':'Missing required fields'});
        }
        
    })
}

// Token - get
// Required data : id
// Optional data : none
handlers._tokens.get = (data) => {
    return new Promise((resolve,reject) => {
        // Check the id provided is valid
        let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
        if(id){
            // Lookup the token
            _data.read('tokens',id)
            .then((data)=>{
                // Token exists
                if(data.id){
                    // Remove the hash password from the user object before returning to the requester
                    resolve({'statusCode':'200','payload':data});
                }else{
                    reject({'statusCode':'500','payload':'Could not read the token id'});
                }

            })
            .catch((err)=>{
                reject({'statusCode':'404','payload':{}});
            })
        }else{
            reject({'statusCode':'400','payload':'Missing required field'});
        }
    });
}

// Token - put
// Required data : id,extend
// Optional data : none
handlers._tokens.put = (data) => {
    return new Promise((resolve,reject) => {
        let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
        let extend = typeof(data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;
        if(id && extend){
            // Look up the token
            _data.read('tokens',id)
            .then((data)=>{
                // Token exists
                if(data.id){
                    // Check token isn't already expired
                    if(data.expires > Date.now()){
                        // Set the expiration an hour from now
                        data.expires = Date.now() + 1000 * 60 * 60;
                        // Store the new updates
                        _data.update('tokens',id,data)
                        .then((data)=>{resolve({'statusCode':'200','payload':data})})
                        .catch((err) => {
                            reject({'statusCode':'500','payload':'Could not update the token'});
                        });
                    }else{
                        reject({'statusCode':'400','payload':'Token already expired. Cannot be extended.'});
                    }
                }else{
                    reject({'statusCode':'500','payload':'Could not read the token id'});
                }
            })
            .catch((err)=>{
                reject({'statusCode':'404','payload':{}});
            })
        }else{
            reject({'statusCode':'400','payload':'Missing required field(s) or invalid'});
        }
    });
}

// Token - delete
// Required data : id
// Optional data : None
handlers._tokens.delete = (data) => {
    return new Promise((resolve,reject) => {
        // Check the id is valid
        let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
        if(id){
            // Lookup the token
            _data.read('tokens',id)
            .then((data)=>{
                _data.delete('tokens',data.id)
                .then((data)=>{resolve({'statusCode':'200','payload':'This token was deleted'})})
                .catch((err) => {reject({'statusCode':'500','payload':'Could not delete the token'})});
            })
            .catch((err)=>{
                reject({'statusCode':'400','payload':'Token not exists'});
            });
        }else{
            reject({'statusCode':'400','payload':'Missing required field'});
        }
    });
}


// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (id,phone) => {
    return new Promise((resolve,reject) => {
        // Lookup the token
        _data.read('tokens',id)
        .then((data)=>{
            // Check that the token is for the given user and has not expired
            if(data.phone == phone && data.expires > Date.now()){
                resolve(true);
            }else{
                reject(false);
            }
        })
        .catch((err)=>{
            reject(false);
        });
    });
};

// Checks
handlers.checks = (data)=>{
    return new Promise((resolve,reject) => {
        let acceptableMethods = ['get','put','post','delete'];
        if(acceptableMethods.indexOf(data.method) > -1){
            handlers._checks[data.method](data)
            // handlers._users.post(data)
            .then((data)=>{
                resolve(data);
                
            })
            .catch((err)=>{
                reject(err);
            });
            // console.log(200);
            // resolve(200);
        }else{
            reject(405);
            // callback(405);
        }
    });
};

// Container for all the checks methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = (data) => {
    return new Promise((resolve,reject) => {

        let protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
        let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
        let method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
        let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
        let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds %1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <=5 ? data.payload.timeoutSeconds : false;
        
        if(protocol && url && method && successCodes && timeoutSeconds){
            let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;           
            // Lookup the user by reading the token
            _data.read('tokens',token)
            .then((tokenData)=>{
                if(tokenData){
                    let phone = tokenData.phone;
                    // Lookup the user data
                    _data.read('users',phone)
                    .then((userData)=>{
                        // User exists
                        if(userData){

                            let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];

                            // Verify that the user has less than the number of max-check-per-user
                            if(userChecks.length < config.maxChecks){
                                // Create a random id for the check
                                let checkId = helpers.createRandomString(20);

                                // Create the check object and include the user's phone
                                let checkObject = {
                                    'id' : checkId,
                                    'userPhone' : phone,
                                    'protocol' : protocol,
                                    'url' : url,
                                    'method' : method,
                                    'successCodes' : successCodes,
                                    'timeoutSeconds' : timeoutSeconds
                                };
                                // Store the check
                                _data.create('checks',checkId,checkObject)
                                .then((data) => {
                                    // Add the checkId to the user's object
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    // Save the new user data
                                    _data.update('users',phone,userData)
                                    .then((data)=>{resolve({'statusCode':'200','payload':checkObject})})
                                    .catch((err) => {
                                        reject({'statusCode':'500','payload':'Could not update the user'});
                                    });

                                })
                                .catch((err) => {
                                    reject({'statusCode':'500','payload':'Could not create the new check'});
                                })
                            
                            }else{
                                reject({'statusCode':'400','payload':`The user already has the maximum number of checks (${config.maxChecks})`});
                            }
                        }else{
                            reject({'statusCode':'403','payload':'No userData'});
                        }

                    })
                    .catch((err)=>{
                        reject({'statusCode':'403','payload':'Can not read users'});
                    })

                    // resolve(true);
                }else{
                    reject({'statusCode':'403','payload':'No token data'});
                }
            })
            .catch((err)=>{
                reject({'statusCode':'403','payload':'Can not read tokens'});
            });
        }else{
            reject({'statusCode':'403','payload':'Required data is missing'});
        }
    });
};


// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = (data) => {
    return new Promise((resolve,reject) => {
        // Check that the id number provided is valid
        let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length ==20 ? data.queryStringObject.id.trim() : false;
        if(id){
            console.log(id)
            // Lookup the check
            _data.read('checks',id)
                .then((checkData)=>{
                    // User exists
                    if(checkData){
                        // Get the token from the headers
                        let token = typeof(data.headers.token)=='string' ? data.headers.token : false;
                        // Verify that the given token is valid and belongs to the user who created the check
                        handlers._tokens.verifyToken(token,checkData.userPhone)
                        .then((tokenIsValid) => {
                            // Return the check data
                            resolve({'statusCode':'200','payload':checkData});
                        })
                        .catch((err) => {
                            reject({'statusCode':'403','payload':'Missing required token in header, or token is invalid'});

                        })
                    }else{
                        reject({'statusCode':'404','payload':'No check Data'});
                    }
                })
                .catch((err)=>{
                    reject({'statusCode':'404','payload':'Could not read the check Data'});
                })
        }else{
            reject({'statusCode':'400','payload':'Missing required field'});
        }
    })
};

// Checks - put
// Required data : id
// Optional data : protocol, url, method, successCodes, timeoutSeconds (at least one)
handlers._checks.put = (data) => {
    return new Promise((resolve,reject) => {
        // Check that the phone number provided is valid
        let id = typeof(data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;

        //  Check for the optional fields
        let protocol = typeof(data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
        let url = typeof(data.payload.url) == 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false;
        let method = typeof(data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
        let successCodes = typeof(data.payload.successCodes) == 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
        let timeoutSeconds = typeof(data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds %1 === 0 && data.payload.timeoutSeconds >=1 && data.payload.timeoutSeconds <=5 ? data.payload.timeoutSeconds : false;
       
        // Error if id is invalid
        if(id){
            // Check at least one optional data
            if(protocol || url || method || successCodes || timeoutSeconds){
                // Lookup the check
                _data.read('checks',id)
                    .then((checkData)=>{
                        // Get the token from the headers
                        let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;   
                        // Verify that the given token is valid for the phone number
                        handlers._tokens.verifyToken(token,checkData.userPhone)
                            .then((data) => {

                                if(protocol){
                                    checkData.protocol = protocol;
                                }
                                if(url){
                                    checkData.url = url;
                                }
                                if(method){
                                    checkData.method = method;
                                }
                                if(successCodes){
                                    checkData.successCodes = successCodes;
                                }
                                if(timeoutSeconds){
                                    checkData.timeoutSeconds = timeoutSeconds;
                                }



                                
                                // Store the new updates
                                _data.update('checks',id,checkData)
                                .then((data)=>{resolve({'statusCode':'200','payload':data})})
                                .catch((err) => {
                                    reject({'statusCode':'500','payload':'Could not update the checks'});
                                });      
                                




                            })
                            .catch((err) => {
                                reject({'statusCode':'403','payload':'Missing required token in header, or token is invalid'});
                            })        

                            
                    })
                    .catch((err)=>{
                        reject({'statusCode':'400','payload':'Check not exists'});
                    })







                
                


            }else{
                reject({'statusCode':'400','payload':'Missing fields to update'});
            }
        }else{
            reject({'statusCode':'400','payload':'Missing required field'});
        }
    });
};

// Checks - delete
// Required data : id
// Optional data : None
handlers._checks.delete = (data) => {
    return new Promise((resolve,reject) => {

        // Check the id is valid
        let id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
        
        if(id){
            // Lookup the check 
            _data.read('checks',id)
                .then((checkData)=>{
                        
                    // Get the token from the headers
                    let token = typeof(data.headers.token) == 'string' ? data.headers.token : false;
                    // Verify that the given token is valid for the phone number
                    handlers._tokens.verifyToken(token,checkData.userPhone)
                    .then((data) => {
                        // Delete the check data
                        _data.delete('checks',id)
                        .then((data)=>{


                            // Lookup the user
                            _data.read('users',checkData.userPhone)
                            .then((userData)=>{


                                console.log(userData)
                                let userChecks = typeof(userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : [];
                                // Remove the deleted check from the list of checks
                                let checkPosition = userChecks.indexOf(id);
                                if(checkPosition >-1 ){
                                    userChecks.splice(checkPosition,1);
                                    // Re-save the user data
                                    _data.update('users',checkData.userPhone,userData)
                                    .then((data)=>{resolve({'statusCode':'200','payload':'This user was updated'})})
                                    .catch((err) => {reject({'statusCode':'500','payload':'Could not update the user'})});
                                }else{
                                    reject({'statusCode':'500','payload':'Could not find the check on the user\'s object'});
                                }
                            })
                            .catch((err)=>{
                                reject({'statusCode':'500','payload':'Could not find the user who created the check, so check was not removed from the list of checks on the user object'});
                            })    
                        })
                        .catch((err) => {reject({'statusCode':'500','payload':'Could not delete the check'})});

                        
                    })
                    .catch((err) => {
                        reject({'statusCode':'403','payload':'Missing required token in header, or token is invalid'});

                    }) 
                })
                .catch((err)=>{
                    reject({'statusCode':'400','payload':'Check Id does not exists'});
                })           
        }else{
            reject({'statusCode':'400','payload':'Missing required field'});
        }      
    });
};


// DB
handlers.db = (data)=>{
    return new Promise((resolve,reject) => {
        let acceptableMethods = ['get','put','post','delete'];
        if(acceptableMethods.indexOf(data.method) > -1){
            handlers._db[data.method](data)
            // handlers._users.post(data)
            .then((data)=>{
                // console.log("resolve users");
                resolve(data);
                
            })
            .catch((err)=>{
                // console.log("reject users");
                reject(err);
            });
        }else{
            reject(405);
        }
    });
};


// Conteiner for the users submethods
handlers._db = {};

// Users - Post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional Data: none
handlers._db.post = (data) => {

    return new Promise((resolve,reject) => {

        // Check that all required fields are filled out
        let firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
        let lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
        let phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length > 10 ? data.payload.phone.trim() : false;
        let password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 10 ? data.payload.password.trim() : false;
        let tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

        if(firstName && lastName && phone && password && tosAgreement){
            
            // Make sure that the user doesn't already exist
            _db.connect()
            .then((db)=>{
                // console.log(data);
                // User already exist

                db.collection('users').insertOne({
                    'firstName':firstName,
                    'lastName':lastName
                })

                resolve({'statusCode':'200','payload':'db'});
            })
            
            .catch((err) => {
                reject({'statusCode':'400','payload':'sth went wrong with connect'});
            })
            // .catch((err) => {
            //     // Hash the password
            //     let hashedPassword = helpers.hash(password);
            //     // Create the user Object
            //     if(hashedPassword){
            //         let userObject = {
            //             'firstName' : firstName,
            //             'lastName' : lastName,
            //             'phone' : phone,
            //             'hashedPassword' : hashedPassword,
            //             'tosAgreement' : true
            //         };
            //         // Store the user
            //         _data.create('users',phone,userObject)
            //         .then((data) => {
            //             resolve({'statusCode':'200','payload':data});
            //         })
            //         .catch((err) => {
            //             reject({'statusCode':'500','payload':'Could not create the new user'});
            //         })
            //     }else{
            //         reject({'statusCode':'500','payload':'Could not hash the user\'s password'});
            //     }   
            // });
        }else{
            reject({'statusCode':'400','payload':'Missing required fields'});
        }

    });
};

// Ping handler
handlers.ping = (data) => {
    return new Promise((resolve,reject) => {
        console.log(data.payload);
        resolve({'statusCode':'200','payload':''});
    });
};

// Page not found
handlers.notFound = (data) => {
    return new Promise((resolve,reject) => {
        // console.log(data);
        reject({'statusCode':'404','payload':'Page not found'});
    });
};

// Export the module
module.exports = handlers;