/*
*
* Library for storing and editing data
*
*/

// Dependencies
const fs = require('fs');
const path = require('path');
let helpers = require('./helpers');


// Container for the module to be exported
var lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.data/');

lib.create = (dir,file,data)=>{
    return new Promise((resolve, reject) => {
        fs.open(lib.baseDir+dir+'/'+file+'.json','wx', (err,fileDescriptor) => {
                if(!err && fileDescriptor){
                    //   Convert data to string
                    var stringData = JSON.stringify(data);
                    // write to file and close it
                    fs.writeFile(fileDescriptor,stringData,(err)=>{
                        if(!err){
                            fs.close(fileDescriptor,(err)=>{
                                if(!err){
                                    resolve(data);
                                }else{
                                    reject('Error closing file');
                                }
                            })

                        }else{
                            reject('Error writing to a new file');
                        }
                    })
                }else{
                    reject('Could not create new file, it may already exists');
                }
        })
      })
};

// Read data from a file
lib.read = (dir,file)=>{
    return new Promise((resolve,reject) => {
        fs.readFile(lib.baseDir+dir+'/'+file+'.json','utf8', (err,fileDescriptor) => {
            if(!err){
                let parsedData=helpers.parseJsonToObject(fileDescriptor);
                resolve(parsedData)
            }else{
                reject(err);
            }
        })
    })
};

// Update data inside a file
/*lib.update = (dir,file,data)=>{
    return new Promise((resolve,reject) => {
        // Open the file for writing
        // console.log(lib.baseDir+dir+'/'+file+'.json')
        fs.open(lib.baseDir+dir+'/'+file+'.json','r+', (err,fileDescriptor) => {
            if(!err & fileDescriptor){
                //   Convert data to string
                var stringData = JSON.stringify(data);
                // Truncate the file
                // console.log('fileDescriptor in data lib.update: ',fileDescriptor)
                fs.ftruncate(fileDescriptor,(err)=>{
                    if(!err){
                        // Write to the file and close it
                        fs.writeFile(fileDescriptor,stringData,(err)=>{
                            if(!err){
                                fs.close(fileDescriptor,(err)=>{
                                    if(!err){
                                        resolve();
                                    }else{
                                        // console.log(err);
                                        reject('Error closing existing file',err);
                                    }
                                })
                            }else{
                                // console.log(err);
                                reject('Error writing to existing file',err);
                            }
                        });
                    }else{
                        // console.log(err);
                        reject('Error truncating file',err);
                    }
                });
                // resolve(fileDescriptor)
            } else{
                // console.log(err);
                reject(`${err}. Could not open the file for updating, it may not exist yet.`);
            }
        })
    })
}
*/

lib.update = (dir,file,data)=>{
    return new Promise((resolve,reject) => {
        // Open the file for writing
        // console.log(lib.baseDir+dir+'/'+file+'.json')
        fs.promises.open(lib.baseDir+dir+'/'+file+'.json','r+')
        .then((FileHandle) => {
            // console.log(FileHandle);
                
                //   Convert data to string
                var stringData = JSON.stringify(data);
                // Truncate the file
                // console.log('fileDescriptor in data lib.update: ',fileDescriptor)
                fs.promises.truncate(lib.baseDir+dir+'/'+file+'.json')
                .then(()=>{

                    // Write to the file and close it
                    fs.promises.writeFile(lib.baseDir+dir+'/'+file+'.json',stringData)
                    // .then(()=>{

                    //         // fs.promises.close(FileHandle.fd)
                    //         // .then(()=>{
                                
                    //         // })
                    //         // .catch((err)=>{
                    //         //     reject('Error closing existing file',err);
                    //         // })
                                
                    //     console.log(filehandle);

                    // })
                    .then(()=>{
                        resolve();
                    })
                    
                    .catch((err)=>{
                        reject('Error writing to existing file',err);
                    });
                })
                
                .catch((err)=>{
                    reject(`Could not truncate the data file. Error: ${err}`);
                })
                .finally(()=>{
                    FileHandle.close();

                });
;
                    
            
                // resolve(fileDescriptor)
                // console.log(err);
                
            
        })
        
        .catch((err)=>{
            reject(`${err}. Could not open the file for updating, it may not exist yet.`);
        });                
    })
}


// Delete a file
lib.delete = (dir,file) => {
    return new Promise((resolve,reject) => {
        fs.unlink(lib.baseDir+dir+'/'+file+'.json',(err)=>{
            if(!err){
                resolve(true);
            } else {
                console.log(err);
                reject('Error deleting the file');
            }
        })
    })
}

// List all items in a directory
lib.list = (dir) => {
    return new Promise((resolve,reject) => {
        fs.readdir(lib.baseDir+dir+'/',(err,data)=>{
            // console.log(data);
            if(!err && data && data.length > 0){
                let trimmedFileNames = [];
                data.forEach((fileName)=>{
                    trimmedFileNames.push(fileName.replace('.json',''));
                })
                // console.log(trimmedFileNames);
                resolve(trimmedFileNames);
            }else{
                // console.log(err);
                reject(err);
            }
        })
    })
}



// Export the module
module.exports = lib;