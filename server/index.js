const express = require("express");
const socket = require("socket.io");
const morgan = require("morgan");
const PORT = process.env.PORT || 9000;
const fs = require("fs");
var https = require('https');
const speech = require('@google-cloud/speech');


var privateKey = fs.readFileSync('./server/ssl/server.key');
var certificate = fs.readFileSync('./server/ssl/server.cert');
var credentials = {key: privateKey, cert: certificate};

//var app = express.createServer(credentials);


const app = express();
app.use(
  morgan(
    ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'
  )
);
// Serve static HTML page
app.use(express.static('public'));



console.log("Starting express...");
// const server = app.listen(PORT, () => {
//   console.log(`App listening on port ${PORT}!`);
// });
// Setup logger

// HTTPS
var httpsServer = https.createServer(credentials, app);

httpsServer.listen(9000);

let io = socket(httpsServer);

let connectedUsers = [];
let blobData = [];

io.on("connection", (socket) => {
  socket.on("send-blob", (blob64) => {
    console.log(blob64.length);
    blobData.push(Buffer.from(blob64, "base64"));
    console.log(blobData);
  });
  socket.on("initialize", () => {
    console.log("receiving initialization from", socket.id);
    //io.to(socket.id).emit("message", "You are connected");
    if (connectedUsers.length === 1) {
      connectedUsers.push(socket.id);
    } else {
      connectedUsers = [socket.id];
    }
    console.log(connectedUsers);
  });

  socket.on("video-offer", (data) => {
    console.log("transmitting video offer from", socket.id);
    let targetUser;
    if (socket.id === connectedUsers[0]) {
      targetUser = connectedUsers[1];
    } else {
      targetUser = connectedUsers[0];
    }
    io.to(targetUser).emit("video-offer", data);
  });

  socket.on("video-answer", (data) => {
    console.log("transmitting video answer from", socket.id);
    //console.log(data);
    let targetUser;
    if (socket.id === connectedUsers[0]) {
      targetUser = connectedUsers[1];
    } else {
      targetUser = connectedUsers[0];
    }
    io.to(targetUser).emit("video-answer", data);
  });
  socket.on("new-ice-candidate", (data) => {
    console.log("transmitting ice candidate from", socket.id);
    let targetUser;
    if (socket.id === connectedUsers[0]) {
      targetUser = connectedUsers[1];
    } else {
      targetUser = connectedUsers[0];
    }
    io.to(targetUser).emit("new-ice-candidate", data);
  });
  socket.on("hang-up", () => {
    console.log("transmitting ice candidate from", socket.id);
    let targetUser;
    if (socket.id === connectedUsers[0]) {
      targetUser = connectedUsers[1];
    } else {
      targetUser = connectedUsers[0];
    }
    io.to(targetUser).emit("hang-up");
  });
  socket.on("end-record", () => {
    // console.log(typeof blobData[0]);
    
    var allAudio = Buffer.concat(blobData);
    
    // getTranscription(allAudio.toString("base64")).catch(console.error);;
    // for (let i = 1; i < blobData.length; i++) {

    //   console.log(blobData[i].toString("base64"));
    // }
    getTranscription(allAudio.toString("base64")).catch(console.error);;
    //fs.writeFileSync("./server/wavtest.wav", )
  });
});

async function getTranscription(audioBytes) {
  // Creates a client
  const client = new speech.SpeechClient();
 
  // // The name of the audio file to transcribe
  // const fileName = './server/speech_16kbps_wb.wav';

  // Reads a local audio file and converts it to base64
  // const file = fs.readFileSync(fileName);
  // const audioBytes = file.toString('base64');
  // console.log(audioBytes);
 
  // The audio file's encoding, sample rate in hertz, and BCP-47 language code
  
  console.log("length of thing being sent to google", audioBytes.length);
  const audio = {
    content: audioBytes,
    // data: file,
  };
  const config = {
    // encoding: 'AMR',
    encoding: 'LINEAR16',
    // encoding: 'OGG_OPUS',
    // sampleRateHertz: 16000,
    languageCode: 'en-US',
    audioChannelCount: 2,
    enableSeparateRecognitionPerChannel: false,
    enableAutomaticPunctuation: true,
    enableWordTimeOffsets: true,
  };
  const request = {
    audio: audio,
    config: config,
  };
 
  // Detects speech in the audio file
  const [operation] = await client.longRunningRecognize(request);
  // const response = await operation.promise();
  const fullResponse = await operation.promise();
  const [response] = fullResponse;
  console.log(response);
  // const [response] = await client.recognize(request);
  // console.log(response);
  fs.writeFileSync("./server/sample-transcription.json", JSON.stringify(fullResponse));
  console.log(JSON.stringify(response));
  // const transcription = response.results
  //   .map(result => result.alternatives[0].transcript)
  //   .join('\n');
  // console.log(`Transcription: ${transcription}`);
}