const express = require("express");
const socket = require("socket.io");
const morgan = require("morgan");
const PORT = process.env.PORT || 9000;
const fs = require("fs");
const speech = require("@google-cloud/speech");
const { firebase } = require("./firebase");
const db = firebase.firestore();


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
const server = app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}!`);
});

// HTTPS
// const privateKey = fs.readFileSync("./server/ssl/server.key");
// const certificate = fs.readFileSync("./server/ssl/server.cert");
// const credentials = {key: privateKey, cert: certificate};
// const https = require("https");
// let server = https.createServer(credentials, app);
// server.listen(9000);
// END HTTPS SECTION

let io = socket(server);

const {
  initializeConversationData,
  extractConversationData,
  addSpeech,
  getTranscription
} = require("./serverutil.js");

let connectedUsers = [];
let bufferData = {};
let currentConversation = {};

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
    
    let targetUser = connectedUsers[((connectedUsers.indexOf(socket.id) + 1) % 2)];
    if (io.sockets.connected[targetUser] !== undefined) {
      io.to(targetUser).emit("video-offer", data);
    } else {
      io.to(socket.id).emit("message", "User has disconnected");
    }
  });

  socket.on("video-answer", (data) => {
    console.log("transmitting video answer from", socket.id);
    //console.log(data);
    let targetUser = connectedUsers[((connectedUsers.indexOf(socket.id) + 1) % 2)];
    io.to(targetUser).emit("video-answer", data);
    currentConversation = initializeConversationData(socket.id, targetUser);
    console.log("creating conversation on answer", currentConversation);
  });

  socket.on("new-ice-candidate", (data) => {
    console.log("transmitting ice candidate from", socket.id);
    let targetUser = connectedUsers[((connectedUsers.indexOf(socket.id) + 1) % 2)];
    io.to(targetUser).emit("new-ice-candidate", data);
  });
  socket.on("hang-up", () => {
    console.log("transmitting ice candidate from", socket.id);
    let targetUser = connectedUsers[((connectedUsers.indexOf(socket.id) + 1) % 2)];
    io.to(targetUser).emit("hang-up");
  });
  socket.on("end-record", async () => {
    // console.log(typeof blobData[0]);
    
    if (bufferData[socket.id] !== undefined) {
      var allAudio = Buffer.concat(bufferData[socket.id]);
      let googleResult = await getTranscription(allAudio.toString("base64"), socket.id).catch(console.error);
      googleResult = JSON.parse(googleResult);
      if (socket.id === connectedUsers[0]) {
        console.log("google result outside of util", googleResult);
      }
      let CONSOLEME = false;
      // console.log(currentConversation);
      if (currentConversation.speech.length > 0) {
        CONSOLEME = true;
      }
      addSpeech(
        currentConversation, 
        extractConversationData(socket.id, googleResult)
      );
      if (CONSOLEME) {
        console.log("Complete conversation after results", currentConversation);
        addDialogue(currentConversation);
      }
      delete bufferData[socket.id];
      console.log(`deleted user ${socket.id} from recording data, leaving ${Object.keys(bufferData)}`);
    }
  });
});

const addDialogue = (data) => {
  
  db.collection("dialogues")
  .add(data)
  .then(docRef => {
    console.log(docRef)
  });
}