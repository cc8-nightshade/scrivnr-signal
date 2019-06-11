// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');
const fs = require('fs');

async function main() {
  // Creates a client
  const client = new speech.SpeechClient();
 
  // The name of the audio file to transcribe
  const fileName = './server/testxxxx.ogg';

  // Reads a local audio file and converts it to base64
  const file = fs.readFileSync(fileName);
  const audioBytes = file.toString('base64');
  //console.log(audioBytes);
 
  // The audio file's encoding, sample rate in hertz, and BCP-47 language code
  const audio = {
    content: audioBytes,
    // data: file,
  };
  const config = {
    // encoding: 'AMR',
    // encoding: 'LINEAR16',
    encoding: 'OGG_OPUS',
    sampleRateHertz: 48000,
    languageCode: 'en-US',
    // audioChannelCount: 2,
    // enableSeparateRecognitionPerChannel: false,
  };
  const request = {
    audio: audio,
    config: config,
  };
 
  // Detects speech in the audio file
  const [operation] = await client.longRunningRecognize(request);
  // const response = await operation.promise();
  const [response] = await operation.promise();
  console.log(response);
  // const [response] = await client.recognize(request);
  console.log(response);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  console.log(`Transcription: ${transcription}`);
}
main().catch(console.error);