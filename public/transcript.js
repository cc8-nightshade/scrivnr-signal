const firebaseConfig = {
  apiKey: "AIzaSyBkO2Id9fChJLJEIoDncFQIZkveN1p4O6M",
  authDomain: "scrivnr-8564b.firebaseapp.com",
  databaseURL: "https://scrivnr-8564b.firebaseio.com",
  projectId: "scrivnr-8564b",
  storageBucket: "scrivnr-8564b.appspot.com",
  messagingSenderId: "965017963607",
  appId: "1:965017963607:web:f4a5340fb6997601"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore()
const coll = db.collection("transcripts")

const row = document.getElementById('transcript-row')
const rowTwo = document.getElementById('transcript-list')

coll.get().then(querySnapshot => {
  let transcriptArray = []
  querySnapshot.forEach(doc => {
    transcriptArray.push(doc.data())
    console.log(transcriptArray[0].speech)
    transcriptArray.forEach((transcript, i) => {
      const transcriptList = document.createElement("div"); 
      transcriptList.innerText = `${i} ${transcript.caller} \n ${transcript.startDateTime}`
      rowTwo.appendChild(transcriptList)
    })

    transcriptArray[0].speech.forEach((trans, i) => {
      if(i % 2 == 0){
        const speaker = document.createElement("div"); 
        speaker.innerText = `${trans.time} \n ${trans.text}`     
        speaker.classList.add("col", "s12", "m6", "sendMessage")
        row.appendChild(speaker)
      } else {
        const speaker = document.createElement("div"); 
        speaker.innerText = `${trans.time} \n ${trans.text}`
        speaker.classList.add("col", "s12", "m6", "offset-m5", "receiveMessage")
        row.appendChild(speaker)
      }
    })
  })
})




