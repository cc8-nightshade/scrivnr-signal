const express = require("express");
const socket = require("socket.io");
const morgan = require("morgan");
const PORT = process.env.PORT || 9000;
const fs = require("fs");
var https = require("https");
const speech = require("@google-cloud/speech");


var privateKey = fs.readFileSync("./server/ssl/server.key");
var certificate = fs.readFileSync("./server/ssl/server.cert");
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
let bufferData = {};

io.on("connection", (socket) => {
  socket.on("send-blob", (blob64) => {
    if (bufferData[socket.id] === undefined) {
      bufferData[socket.id] = [];
    }
    bufferData[socket.id].push(Buffer.from(blob64, "base64"));
    console.log(`User ${socket.id} has -- ${bufferData[socket.id].length} -- pieces of data`)
    // console.log(blob64.length);
    // console.log(blobData);
  });
  socket.on("initialize", () => {
    console.log("receiving initialization from", socket.id);
    //io.to(socket.id).emit("message", "You are connected");
    switch (connectedUsers.length) {
      case 0: { // if no users yet, add user as the sole user
        connectedUsers = [socket.id];
        break;
      }
      case 1: { // if only one connected user, add second
        connectedUsers.push(socket.id);
        break;
      }
      case 2: { // if already 2 users, push out last one.
        connectedUsers[0] = connectedUsers[1];
        connectedUsers[1] = socket.id;
      }
    }
    console.log(connectedUsers);
    //console.log(io.sockets.connected);
  });

  socket.on("video-offer", (data) => {
    console.log("transmitting video offer from", socket.id);
    
    let targetUser;
    if (socket.id === connectedUsers[0]) {
      targetUser = connectedUsers[1];
    } else {
      targetUser = connectedUsers[0];
    }
    if (io.sockets.connected[targetUser] !== undefined) {
      io.to(targetUser).emit("video-offer", data);
    } else {
      io.to(socket.id).emit("message", "User has disconnected");
    }
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
  socket.on("end-record", async () => {
    // console.log(typeof blobData[0]);
    
    if (bufferData[socket.id] !== undefined) {
      var allAudio = Buffer.concat(bufferData[socket.id]);
      await getTranscription(allAudio.toString("base64"), socket.id).catch(console.error);
      delete bufferData[socket.id];
      console.log(`deleted user ${socket.id} from recording data, leaving ${Object.keys(bufferData)}`);
    }
    //fs.writeFileSync("./server/wavtest.wav", )
  });
});

async function getTranscription(audioBytes, socketID) {
  // Creates a client
  const client = new speech.SpeechClient();
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
  fs.writeFileSync(`./server/sample-transcription-${socketID}.json`, JSON.stringify(fullResponse));
  // console.log(`${socketID} said: ${response.results[0].alternatives[0].transcript}`);
  // const transcription = response.results
  //   .map(result => result.alternatives[0].transcript)
  //   .join('\n');
  // console.log(`Transcription: ${transcription}`);
}