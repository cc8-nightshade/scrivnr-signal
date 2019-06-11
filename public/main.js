let mySocket;
let myPeerConnection;
let mediaRecorder;
let reader = new FileReader();

document.addEventListener("loadend", initialConnect());

function initialConnect() {
  // alert("tesitng123");
  mySocket = io.connect();
  mySocket.on("message", (messageData) => {
    alert(messageData);
  });
  mySocket.on("video-offer", (videoOfferData) => {
    document.getElementById("testing").innerHTML = videoOfferData;
    console.log("receiving offer", videoOfferData);
    if (!myPeerConnection) {
      console.log("handling video offer", videoOfferData);

      handleVideoOfferMessage(videoOfferData);
    }
  });
  mySocket.on("video-answer", (videoAnswerData) => {
    handleVideoAnswerMessage(videoAnswerData);
  });
  mySocket.on("new-ice-candidate", (iceCandidate) => {
    handleNewICECandidateMsg(iceCandidate);
  });
  mySocket.on("hang-up", (iceCandidate) => {
    closeVideoCall();
  });
  mySocket.emit("initialize");
  console.log(mySocket);
}

function getTranslation () {
  mySocket.emit("end-record");
}

function startCall() {
  console.log(mySocket);
  createPeerConnection();
  console.log("Creating caller's connection", myPeerConnection);
  var mediaConstraints = {
    audio: true
    // {
    //   sampleRate: 16000,
    //   channelCount: 1,
    //   volume: 1.0,
    //   echoCancellation: true
    //   ,
    //   noiseSuppression: true,
    // }
    // audio: true// We want an audio track
    // ,
    // video: true // ...and we want a video track
  };
  navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then((stream) => {
      //document.getElementById("local_video").srcObject = stream;
      stream.getTracks().forEach(track => myPeerConnection.addTrack(track, stream));
      mediaRecorder = new MediaStreamRecorder(stream);
      mediaRecorder.mimeType = 'audio/wav'; // check this line for audio/wav
      // mediaRecorder.mimeType = 'audio/ogg'; // check this line for audio/wav
      mediaRecorder.ondataavailable = async (blob) => {
        //chunks.push(blob);
        //console.log("pushing blob", chunks);
        
        reader.readAsDataURL(blob); 
        reader.onloadend = function() {
          mySocket.emit("send-blob", reader.result.substring(22));
          console.log(reader.result.substring(22));
        }
        // mySocket.emit("send-blob", blob.toString("base64"));
        // console.log("base64 blob", blob.toString("base64"))
      };
      mediaRecorder.start();
    });
    // TODO .catch(handleGetUserMediaError);
}


function createPeerConnection() {
  myPeerConnection = new RTCPeerConnection({
      iceServers: [     // Information about ICE servers - Use your own!
        {
          urls: "stun:stun.l.google.com:19302"
        }
      ]
  });

  myPeerConnection.onicecandidate = handleICECandidateEvent;
  myPeerConnection.ontrack = handleTrackEvent;
  myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
  // Other Things that could be implemented for 
  // myPeerConnection.onremovetrack = handleRemoveTrackEvent;
  // myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  // myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  // myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
}

function handleNegotiationNeededEvent() {
  // this outer "if" will stop the callee from creating their own offer automatically when they mount their streams
  if (!myPeerConnection.remoteDescription) { 
    myPeerConnection.createOffer().then((offer) => {
      console.log("this is the offer", offer)
      return myPeerConnection.setLocalDescription(offer);
    })
    .then(function() {
      mySocket.emit("video-offer", {
        // name: myUsername,
        // target: targetUsername,
        //type: "video-offer",
        sdp: myPeerConnection.localDescription
      });
    });
  }
  // TODO  .catch(reportError);
}

function handleTrackEvent (event) {
  document.getElementById("received_video").srcObject = event.streams[0];
  // document.getElementById("hangup-button").disabled = false;
}

function handleVideoOfferMessage(videoOfferData) {
  document.getElementById("call-button").disabled = true;
  createPeerConnection();
  let offerDescription = new RTCSessionDescription(videoOfferData.sdp);
  console.log("session description receiving", offerDescription);
  myPeerConnection.setRemoteDescription(offerDescription)
  .then(() => {
    var mediaConstraints = {
      audio: true
        // {
        // sampleRate: 48000,
        // channelCount: 1,
        // volume: 1.0,
        // echoCancellation: true
        // ,
        // noiseSuppression: true,
        // }
        //audio: true // We want an audio track
        // , 
        // video: true // ...and we want a video track
      };
    return navigator.mediaDevices.getUserMedia(mediaConstraints);
  })
  .then((stream) => {
    // document.getElementById("local_video").srcObject = stream;
    stream.getTracks().forEach((track) => myPeerConnection.addTrack(track, stream));
    mediaRecorder = new MediaStreamRecorder(stream);
    mediaRecorder.mimeType = 'audio/wav'; // check this line for audio/wav
    // mediaRecorder.mimeType = 'audio/ogg'; // check this line for audio/wav
    mediaRecorder.ondataavailable = async (blob) => {
      //chunks.push(blob);
      //console.log("pushing blob", chunks);
      
      reader.readAsDataURL(blob); 
      reader.onloadend = function() {
        mySocket.emit("send-blob", reader.result.substring(22));
        console.log(reader.result.substring(22));
      }
      // mySocket.emit("send-blob", blob.toString("base64"));
      // console.log("base64 blob", blob.toString("base64"))
    };
    mediaRecorder.start();
  })
  .then(() => {
    return myPeerConnection.createAnswer();
  })
  .then((answer) => {
    return myPeerConnection.setLocalDescription(answer);
  })
  .then(()=>{
    console.log("sending my answer", myPeerConnection.localDescription)
    mySocket.emit("video-answer", {
      // name: myUsername,
      // target: targetUsername,
      //type: "video-offer",
      sdp: myPeerConnection.localDescription
    });
  });
  document.getElementById("hangup-button").disabled = true;
}
    
function handleVideoAnswerMessage(videoAnswerData) {
  console.log("handling video answer", videoAnswerData);
  const desc = new RTCSessionDescription(videoAnswerData.sdp);
  myPeerConnection.setRemoteDescription(desc)
    .then(() => {
      console.log("processed video answer successfully")
    })
    .catch((err) => console.log("error handling answer", err));
}

function handleICECandidateEvent(event) {
  console.log("handling new ICE");
  if (event.candidate) {
    mySocket.emit("new-ice-candidate", {
      // type: "new-ice-candidate",
      // target: targetUsername,
      candidate: event.candidate
    });
  }
}

function handleNewICECandidateMsg(msg) {
  console.log("receiving new ICE");
  var candidate = new RTCIceCandidate(msg.candidate);

  myPeerConnection.addIceCandidate(candidate);
    // .catch(reportError);
}

// ENDING OF CALLS
function hangUpCall() {
  closeVideoCall();
  mySocket.emit("hang-up"
  // ,{
  //   name: myUsername,
  //   target: targetUsername,
  //   type: "hang-up"
  // }
  );
}

function closeVideoCall() {
  mediaRecorder.stop();
  setTimeout(() => {mySocket.emit("end-record");}, 2000);
  var remoteVideo = document.getElementById("received_video");
  var localVideo = document.getElementById("local_video");
  if (myPeerConnection) {
    myPeerConnection.ontrack = null;
    myPeerConnection.onremovetrack = null;
    myPeerConnection.onremovestream = null;
    myPeerConnection.onicecandidate = null;
    myPeerConnection.oniceconnectionstatechange = null;
    myPeerConnection.onsignalingstatechange = null;
    myPeerConnection.onicegatheringstatechange = null;
    myPeerConnection.onnegotiationneeded = null;

    if (remoteVideo.srcObject) {
      remoteVideo.srcObject.getTracks().forEach(track => track.stop());
    }

    if (localVideo.srcObject) {
      localVideo.srcObject.getTracks().forEach(track => track.stop());
    }

    myPeerConnection.close();
    myPeerConnection = null;
  }

  remoteVideo.removeAttribute("src");
  remoteVideo.removeAttribute("srcObject");
  localVideo.removeAttribute("src");
  localVideo.removeAttribute("srcObject");
  
  document.getElementById("hangup-button").disabled = true;
  targetUsername = null;
}