if (navigator.mediaDevices) {
  console.log('getUserMedia supported.');

  // var myConstraints = { audio: true };
  var myConstraints = {audio: true
    // {
    // sampleRate: 16000,
    // channelCount: 1,
    // volume: 1.0,
    // echoCancellation: true
    // ,
    // noiseSuppression: true,
  };

  var chunks = [];

  let record = document.getElementById("record-button");
  let stop = document.getElementById("stop-button");
  let soundClips = document.getElementById("audio-player");

  let reader = new FileReader();

  navigator.mediaDevices.getUserMedia(myConstraints)
  .then(function(stream) {
    console.log("inside the then statement after mounting media")
    var mediaRecorder = new MediaStreamRecorder(stream);
    mediaRecorder.mimeType = 'audio/wav'; // check this line for audio/wav
    // mediaRecorder.mimeType = 'audio/ogg'; // check this line for audio/wav
    mediaRecorder.ondataavailable = async (blob) => {
      chunks.push(blob);
      console.log("pushing blob", chunks);
      
      reader.readAsDataURL(blob); 
      reader.onloadend = function() {
        mySocket.emit("send-blob", reader.result.substring(22));
        console.log(reader.result.substring(22));
      }
      // mySocket.emit("send-blob", blob.toString("base64"));
      // console.log("base64 blob", blob.toString("base64"))
    };
    //visualize(stream);

    record.onclick = function() {
      mediaRecorder.start();
      //console.log(mediaRecorder.state);
      console.log("recorder started");
      record.style.background = "red";
      record.style.color = "black";
      //console.log(mediaRecorder.stream);
    }

    stop.onclick = function() {
      mediaRecorder.stop();
      console.log("mediarecorder state", mediaRecorder.state);
      console.log("recorder stopped");
      record.style.background = "";
      record.style.color = "";
    }

    mediaRecorder.onstop = function(e) {
      console.log("data available after MediaRecorder.stop() called.");

      var clipName = prompt('Enter a name for your sound clip');

      var clipContainer = document.createElement('article');
      var clipLabel = document.createElement('p');
      var audio = document.createElement('audio');
      var deleteButton = document.createElement('button');
     
      clipContainer.classList.add('clip');
      audio.setAttribute('controls', '');
      deleteButton.innerHTML = "Delete";
      clipLabel.innerHTML = clipName;

      clipContainer.appendChild(audio);
      clipContainer.appendChild(clipLabel);
      clipContainer.appendChild(deleteButton);
      soundClips.appendChild(clipContainer);

      audio.controls = true;
      // var blob = new Blob(chunks, { 'type' : 'audio/wav' });
      var blob = new Blob(chunks, { 'type' : 'audio/wav' });
      console.log(chunks[0].size, blob.size)
      chunks = [];
      var audioURL = URL.createObjectURL(blob);
      audio.src = audioURL;
      console.log("recorder stopped", );
      mySocket.emit("end-record");

      deleteButton.onclick = function(e) {
        evtTgt = e.target;
        evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
      }
    }

    // mediaRecorder.ondataavailable = function(e) {
    //   chunks.push(e.data);
    // }
  })
  .catch(function(err) {
    console.log('The following error occurred: ' + err);
  });
}

  // OLD MEDIARECORDER METHODS
//   navigator.mediaDevices.getUserMedia(myConstraints)
//   .then(function(stream) {
//     console.log("inside the then statement after mounting media")
//     var mediaRecorder = new MediaRecorder(stream);

//     //visualize(stream);

//     record.onclick = function() {
//       mediaRecorder.start(1000);
//       console.log(mediaRecorder.state);
//       console.log("recorder started");
//       record.style.background = "red";
//       record.style.color = "black";
//       console.log(mediaRecorder.stream);
//     }

//     stop.onclick = function() {
//       mediaRecorder.stop();
//       console.log(mediaRecorder.state);
//       console.log("recorder stopped");
//       record.style.background = "";
//       record.style.color = "";
//     }

//     mediaRecorder.onstop = function(e) {
//       console.log("data available after MediaRecorder.stop() called.");

//       var clipName = prompt('Enter a name for your sound clip');

//       var clipContainer = document.createElement('article');
//       var clipLabel = document.createElement('p');
//       var audio = document.createElement('audio');
//       var deleteButton = document.createElement('button');
     
//       clipContainer.classList.add('clip');
//       audio.setAttribute('controls', '');
//       deleteButton.innerHTML = "Delete";
//       clipLabel.innerHTML = clipName;

//       clipContainer.appendChild(audio);
//       clipContainer.appendChild(clipLabel);
//       clipContainer.appendChild(deleteButton);
//       soundClips.appendChild(clipContainer);

//       audio.controls = true;
//       // var blob = new Blob(chunks, { 'type' : 'audio/wav' });
//       var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
//       chunks = [];
//       var audioURL = URL.createObjectURL(blob);
//       audio.src = audioURL;
//       console.log("recorder stopped");

//       deleteButton.onclick = function(e) {
//         evtTgt = e.target;
//         evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
//       }
//     }

//     mediaRecorder.ondataavailable = function(e) {
  //       chunks.push(e.data);
  //     }
//   })
//   .catch(function(err) {
//     console.log('The following error occurred: ' + err);
//   })
// }

