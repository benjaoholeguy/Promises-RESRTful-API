/*
*
* Lirary for storing and rotating logs
*
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container for the module
let lib = {};


// Base directory of the logs folder
lib.baseDir = path.join(__dirname,'/../.logs/');

// Append a string to a file. Create the file if it does not exist.
// lib.append = (file,str) => {
//     return new Promise((resolve, reject) => {
//         fs.open(lib.baseDir+file+'.log','a', (err,fileDescriptor) => {
//             if(!err && fileDescriptor){
//                 // Append the file and close it 
//                 fs.appendFile(fileDescriptor,str+'\n',(err)=>{
//                     if(!err){
//                         fs.close(fileDescriptor,(err)=>{
//                             if(!err){
//                                 resolve();
//                             }else{
//                                 reject('Error closing the file that was being appended');
//                             }
//                         })
//                     }else{
//                         reject('Error appending to file');
//                     }
//                 })
//             }else{
//                 reject('Could not create new file, it may already exists');
//             }
//         });
//     })
// }

lib.append = (file,str) => {
    return new Promise((resolve, reject) => {
        fs.promises.open(lib.baseDir+file+'.log','a')
        .then((buff)=>{
            // console.log(buff);
            // File content before append 
            const oldContent = buff.toString();
            // Append operation
            fs.promises.appendFile(lib.baseDir+file+'.log',str+'\n')
            
            .then(()=>{
                
                resolve();
            })

            
            .catch(()=>{
                reject('Error appending to file');
            })

            .finally(()=>{
                buff.close();
            });
           

        })
        
        .then(()=>{
            resolve();
        })
        // .then(()=>{
        //     console.log(buff);
        // })
        .catch((err)=>{
            reject('Error reading file');
        });
    })
}

// List all the logs, and optionally include the compressed logs
lib.list = (includeCompressedLogs) => {
    return new Promise((resolve, reject) => {
        fs.readdir(lib.baseDir,(err,data)=>{
            if(!err && data && data.length > 0){
                let trimmedFileNames = [];
                data.forEach((fileName)=>{
                    // Add the .log files
                    if(fileName.indexOf('.log') > -1){
                        trimmedFileNames.push(fileName.replace('.log',''))
                    }
                    // Optionally add on the .gz archive
                    if(fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs){
                        trimmedFileNames.push(fileName.replace('.gz.b64',''))
                    }
                });
                resolve(trimmedFileNames);
            }else{
                reject(err,data);
            }
        })

    })
};

// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = (logId,newFileId) => {
    return new Promise((resolve, reject) => {
        let sourceFile = `${logId}.log`;
        let destFile = `${newFileId}.gz.b64`;
        // Read the source file
        fs.readFile(lib.baseDir+sourceFile,'utf-8',(err,inputString)=>{
            if(!err && inputString){
                // Compress the data using gzip
                zlib.gzip(inputString,(err,buffer)=>{
                    if(!err && buffer){
                        // Send the data to the destination file
                        // fs.open(lib.baseDir+destFile,'wx',(err,fileDescriptor)=>{
                        //     if(!err && fileDescriptor){
                        //         // Write to the destinatio file
                        //         fs.writeFile(fileDescriptor,buffer.toString('base64'),(err)=>{
                        //             if(!err){
                        //                 // Close the destination file
                        //                 fs.close(fileDescriptor,(err)=>{
                        //                     if(!err){
                        //                         resolve();
                        //                     }else{
                        //                         reject(`compress error: ${err}`);
                        //                     }
                        //                 })
                        //             }else{
                        //                 reject(err);
                        //             }
                        //         });
                        //     }else{
                        //         reject(err);
                        //     }
                        // });
                        

                        // fs.promises.open(lib.baseDir+destFile,'wx')
                        // .then(()=>{
                            // File content before append 
                            const oldContent = buffer.toString('base64');
                            // Append operation
                            fs.promises.writeFile(lib.baseDir+destFile,oldContent)
                            
                            .then(()=>{
                                
                                resolve();
                            })

                            
                            .catch(()=>{
                                reject('Error appending to file');
                            });
                        // })
                        // .catch(()=>{
                        //     reject('Error opening file');
                        // });


                    }else{
                        reject(err);
                    }
                });
            }else{
                reject(err);
            }
        });
    });
};

// Decompress the contents of a gz.b64 file into a string variable
lib.decompress = (fileId) => {
    return new Promise((resolve, reject) => {
        let fileName = `${fileId}.gz.b64`;
        // Read the source file
        fs.readFile(lib.baseDir+fileName,'utf-8',(err,str)=>{
            if(!err && str){
                // Decompress the data
                let inputBuffer = Buffer.from(str,'base64');
                zlib.unzip(inputBuffer,(err,outputBuffer)=>{
                    if(!err && outputBuffer){
                        let str = outputBuffer.toString();
                        resolve(str);
                    }else{
                        reject(err);
                    }
                })
            }else{
                reject(err);
            }
        });
    });
};

// Truncate a log file
lib.truncate = (logId) => {
    return new Promise((resolve, reject) => {
        // Open the file for writing
        // fs.open(lib.baseDir+logId+'.log','r+', (err,fileDescriptor) => {
   
        //     if(!err & fileDescriptor){

        //         fs.ftruncate(fileDescriptor,(err)=>{
        //             if(!err){
        //                 resolve();
        //             }else{
        //                 reject(`Could truncate the file: ${err}`);
        //             }
        //         });

        //     } else{
        //         // console.log(err);
        //         reject(`Could not open the file for truncating: ${err}`);
        //     }

        // });


        fs.promises.truncate(lib.baseDir+logId+'.log')
        .then((FileHandle)=>{
            // console.log(FileHandle)
                    // FileHandle.close();
        //     fs.ftruncate(FileHandle.fd,(err)=>{
        //         if(!err){
                    resolve();
        //         }else{
        //             reject(err);
        //         }
        //     });
        })
        .catch((err)=>{
            reject(`Could not truncate the log file. Error: ${err}`);
        });
        
        
    });
};

// Export the module
module.exports = lib;