const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const multer = require('multer');
var springedge = require('springedge');
const details = require("./details.json");

//IMPORT  AND CONSTANT FOR GOOGLE DRIVE API
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';


const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json());

var port = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 8080;
var ip = process.env.OPENSHIFT_NODEJS_IP || process.env.IP || '0.0.0.0';

app.listen(port, ip,  () => {
  console.log("The server started on port 3000 !!!!!!");
 
  
 
});

app.get("/", (req, res) => {
  res.send(
    "<h1 style='text-align: center'>Welcome to Kuldeep Websoft Pvt Ltd </h1>"
  );
});


app.post("/sendmail", (req, res) => {
  console.log("request came");
  let user = req.body;
  console.log(user);
  sendMail(user, info => {
    console.log(`The message has beed send 😃 and the id is ${info.messageId}`);
    res.send(info);
  });
});


app.post("/sendmessage", (req, res) => {
  console.log("request came");
  let params = req.body;

  
springedge.messages.send(params, 5000, function (err, response) {
  if (err) {
    return console.log(err);
  }
  res.send(JSON.stringify(response));
  console.log(response);

});
});

// **********************************************
// *************GOOGLE DRIVE APIS **************** 
// **********************************************

app.get("/getlist", (req, res) => {
  console.log("request came");
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), listFiles);
});

function listFiles(auth) {
  const drive = google.drive({ version: 'v3', auth });
  getList(drive, '');
}
function getList(drive, pageToken) {
  drive.files.list({
      corpora: 'user',
      pageSize: 10,
      q: "name='0_RESUME_Yatish.pdf'",
      pageToken: pageToken ? pageToken : '',
      fields: 'nextPageToken, files(*)',
  }, (err, response) => {
      if (err) return console.log('The API returned an error: ' + err);
      const files = response.data.files;
      res.send(response.data.files);
      if (files.length) {
          console.log('Files:');
          processList(files);
          if (response.data.nextPageToken) {
              getList(drive, response.data.nextPageToken);
          }
       
      } else {
          console.log('No files found.');
      }
  });
}
});



const upload = multer()
app.post('/upload', upload.single('file'), (req, res, next) => {
    let stream = require('stream');
    let fileObject = req.file;
    console.log(req.file);
    fileName = fileObject.originalname.split('最')[0];
   folderID = fileObject.originalname.split('最')[1]
    let bufferStream = new stream.PassThrough();
    bufferStream.end(fileObject.buffer);
    fs.readFile('credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      authorize(JSON.parse(content), uploadFile)
  });
  

  function uploadFile(auth) {
    const drive = google.drive({ version: 'v3', auth });
    var fileMetadata = {
        'name': fileName,
          parents: [folderID]

    }
   
   var media = {
      mimeType: fileObject.mimetype,
      body: bufferStream,
      shared: true
  }
    drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
    }, function (err, response) {
        if (err) {
            // Handle error
            console.log(err);
        } else {
          res.send(JSON.stringify(response.data.id));
          drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
            role: 'reader',
            type: 'anyone',
            }
});
          

            console.log('File Id: ', response.data.id);
            return response.data.id;
        }
    });
  }
 
});


app.post("/getfile", (req, res) => {
  console.log("request came");
  let fileID = req.body.FileId;
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), getFile);
});

function getFile(auth, fileId) {
  const drive = google.drive({ version: 'v3', auth });
  drive.files.get({ fileId: fileID, fields: '*' }, (err, response) => {
      if (err) return console.log('The API returned an error: ' + err);
      console.log(response.data); 
      res.send(response.data);

  });
}

});

app.post("/deletefile", (req, res) => {
  console.log("request came");
  let fileID = req.body.FileId;
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), deleteFile);
});

function deleteFile(auth) {
  const drive = google.drive({ version: 'v3', auth });
 drive.files.delete({
  'fileId': fileID
},function (err, response) {
  if (err) {
      // Handle error
      console.log(err);
  } else {
    // to clean trash bean
    // drive.files.emptyTrash();
    console.log('File Id: ', response.data);
    res.send(JSON.stringify(response.data));
     
  
  }
});
}

});

app.post("/createFolder", (req, res) => {
  console.log("request came");
  let reqData = req.body;

  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    authorize(JSON.parse(content), folder);
});

function folder(auth) {
  const drive = google.drive({ version: 'v3', auth });
  var fileMetadata;
console.log(reqData.type);
if(reqData.type =='p'){
  console.log('inside parent');
 fileMetadata = {
    'name': reqData.folderName,
    'mimeType': 'application/vnd.google-apps.folder'
  };
} else{
  console.log('insidesubfolder')
  console.log(reqData.parentFolderID);
fileMetadata = {
    'name': reqData.folderName,
    'mimeType': 'application/vnd.google-apps.folder',
    "parents": [reqData.parentFolderID]
  };
}

  drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  }, function (err, file) {
    if (err) return console.log('The API returned an error: ' + err);
      console.log(file.data.id);
     res.send(JSON.stringify(file.data.id));
  });
}

});


//GOOGLE DRIVE FUNCTIONS

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getAccessToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client);//list files and upload file
      //callback(oAuth2Client, '0B79LZPgLDaqESF9HV2V3YzYySkE');//get file

  });
}


function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
          if (err) return console.error('Error retrieving access token', err);
          oAuth2Client.setCredentials(token);
          // Store the token to disk for later program executions
          fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
              if (err) return console.error(err);
              console.log('Token stored to', TOKEN_PATH);
          });
          callback(oAuth2Client);
      });
  });
}

// **********************************************
// *************GOOGLE DRIVE API AND FUNCTION END **************** 
// **********************************************

async function sendMail(user, callback) {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
     auth: {
      user: details.email,
      pass: details.password
    }
  });

  let mailOptions = {
    from: user.from, // sender address
    to: user.email, // list of receivers
    subject: user.subject, // Subject line
    html: `<p>Hi ${user.name},</p><br>
    <p>Thanks for joining us</p>`,
  };

  // send mail with defined transport object
  let info = await transporter.sendMail(mailOptions);

  callback(info);
}










// main().catch(console.error);
