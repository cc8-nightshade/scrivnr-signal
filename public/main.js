let mySocket;
let myPeerConnection;
let mySessionDescription;

document.addEventListener("loadend", initialConnect());

function initialConnect() {
  // alert("tesitng123");
  mySocket = io.connect();
  mySocket.on("message", (messageData) => {
    alert(messageData);
  });
  mySocket.on("video-offer", (videoOfferData) => {
    document.getElementById("testing").innerHTML = videoOfferData;
    console.log("receiving video offer", videoOfferData);
    if (myPeerConnection === undefined) {
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
  mySocket.emit("initialize");
  console.log(mySocket);
}

function startCall() {
  console.log(mySocket);
  createPeerConnection();
  console.log("Creating caller's connection", myPeerConnection);
  var mediaConstraints = {
    audio: {
      echoCancellation: {exact: true}
    },
    // audio: true// We want an audio track
    //,
    video: true // ...and we want a video track
  };
  navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then((localStream) => {
      document.getElementById("local_video").srcObject = localStream;
      localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
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
  createPeerConnection();
  let offerDescription = new RTCSessionDescription(videoOfferData.sdp);
  console.log("session description receiving", offerDescription);
  myPeerConnection.setRemoteDescription(offerDescription)
    .then(() => {
      var mediaConstraints = {
        audio: {
          echoCancellation: {exact: true}
        },
        //audio: true // We want an audio track
        //, 
        video: true // ...and we want a video track
      };
      return navigator.mediaDevices.getUserMedia(mediaConstraints);
    })
    .then((stream) => {
      localStream = stream;  
      document.getElementById("local_video").srcObject = localStream;
        localStream.getTracks().forEach((track) => myPeerConnection.addTrack(track, localStream));
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