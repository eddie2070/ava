import React, { useEffect, useReducer, useState } from 'react';

import API, { graphqlOperation } from '@aws-amplify/api';
import Amplify, { PubSub, Predictions } from 'aws-amplify';
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers';
import { AmazonAIPredictionsProvider } from '@aws-amplify/predictions';


import TextLoop from "react-text-loop";
import cxs from "cxs/component";

import mic from 'microphone-stream';
import $ from 'jquery';
import streamAudioToWebSocket from  "./lib/main.js";
import showError from  "./lib/main.js";
import { startbutton } from "./lib/main.js";


import AWS_logo from "./images/AWS_logo_RGB_WHT.png"

// Spinner lib
import { WaveSpinner } from "react-spinners-kit";


import awsconfig from './aws-exports';
import './App.css';

// IoT subscription

Amplify.configure({
  Auth: {
    identityPoolId: process.env.REACT_APP_IDENTITY_POOL_ID,
    region: process.env.REACT_APP_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
  },
  predictions: {
        convert: {
            transcription: {
                region: "us-east-1",
                proxy: false,
                defaults: {
                    "language": "en-US"
                }
            }
        }
    }
});

Amplify.addPluggable(new AWSIoTProvider({
  aws_pubsub_region: process.env.REACT_APP_REGION,
  aws_pubsub_endpoint: `wss://${process.env.REACT_APP_MQTT_ID}.iot.${process.env.REACT_APP_REGION}.amazonaws.com/mqtt`,
}));

Amplify.addPluggable(new AmazonAIPredictionsProvider());


const StyledTextLoop = cxs(TextLoop)({
  display: "block"
});



function SpeechToText(props) {
  const [response, setResponse] = useState("Question from attendee will be displayed here.")
  
  function AudioRecorder(props) {
    const [recording, setRecording] = useState(false);
    const [micStream, setMicStream] = useState();
    const [audioBuffer] = useState(
      (function() {
        let buffer = [];
        function add(raw) {
          buffer = buffer.concat(...raw);
          return buffer;
        }
        function newBuffer() {
          console.log("reseting buffer");
          buffer = [];
        }
 
        return {
          reset: function() {
            newBuffer();
          },
          addData: function(raw) {
            return add(raw);
          },
          getData: function() {
            return buffer;
          }
        };
      })()
    );

    async function startRecording() {
      console.log('start recording');
      audioBuffer.reset();

      window.navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then((stream) => {
        const startMic = new mic();

        startMic.setStream(stream);
        startMic.on('data', (chunk) => {
          var raw = mic.toRaw(chunk);
          if (raw == null) {
            return;
          }
          var audiobuf = audioBuffer.addData(raw);

        });
        
        setRecording(true);
        setMicStream(startMic);
      });
    }

    async function stopRecording() {
      console.log('stop recording');
      const { finishRecording } = props;

      micStream.stop();
      setMicStream(null);
      setRecording(false);

      const resultBuffer = audioBuffer.getData();

      if (typeof finishRecording === "function") {
        finishRecording(resultBuffer);
      }

    }

    return (
      <div className="audioRecorder">
        <div>
          {recording && <button onClick={stopRecording}>Stop recording</button>}
          {!recording && <button onClick={startRecording}>Start recording</button>}
        </div>
      </div>
    );
  }

  function convertFromBuffer(bytes) {
    setResponse('Converting text...');
    
    Predictions.convert({
      transcription: {
        source: {
          bytes
        },
        // language: "en-US", // other options are "en-GB", "fr-FR", "fr-CA", "es-US"
      },
    }).then(({ transcription: { fullText } }) => {
        setResponse(fullText);
        console.log(fullText);
          })
      .catch(err => setResponse(JSON.stringify(err, null, 2)));
  }

  return (
    <div className="Text">
      <div>
        <AudioRecorder finishRecording={convertFromBuffer} />
        <p>{response}</p>
      </div>
    </div>
  );
}


class LCD extends React.Component {
  state = {
    datalcd: null,
    status: 0
  }
  
  componentDidMount() {
    this.getSub()
    
    $('#start-button').click(function () {
      console.log('button pressed')
    $('#error').hide(); // hide any existing errors

    // first we get the microphone input from the browser (as a promise)...
    window.navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
        })
        // ...then we convert the mic stream to binary event stream messages when the promise resolves 
        .then(streamAudioToWebSocket)
         .catch(function (error) {
            showError('There was an error streaming your audio to Amazon Transcribe. Please try again.');
        });
    });
  }
    getSub = () => {
   const datalcd = Amplify.PubSub.subscribe('lcd-message').subscribe({
  next: data => {
    var answer = JSON.stringify(data);
    console.log('answer: ', answer);
    var objectValue = JSON.parse(answer);
    var messageiot = objectValue['value'].message;
    console.log('tip: ', messageiot);
    var presenceiot = objectValue['value'].presence;
    console.log('status: ', presenceiot);
    this.setState({datalcd: messageiot, status: presenceiot});
  },
  error: error => console.error(error),
  close: () => console.log('Done'),
});
  }

  render(){
    const {datalcd, status} = this.state;
      const { loading } = this.state;
    const welcome = 'How can I help?';
    return (
      <div className="App"style = {{height:"130vh", justifyContent: 'center'}}>
      <SpeechToText />

      <div className="Message">
      {(status === 0) ? <TextLoop interval='4000' fade='true' children={["ASK ME", <img src={AWS_logo} alt="Logo" />]} /> : null}
      {(status === 1) ? "How can I help?" : null }
      {(status === "request") ? `AVA: ${datalcd}`  : null}
       </div>
       
               <textarea id="transcript" placeholder="Press Start and speak into your mic" rows="5"
            readonly="readonly"></textarea>
        <div class="row">
            <div class="col">
                <button id="start-button" class="button-xl" title="Start Transcription">
                    <i class="fa fa-microphone"></i> Start
                </button>
                <button id="stop-button" class="button-xl" title="Stop Transcription" disabled="true"><i
                        class="fa fa-stop-circle"></i> Stop
                </button>
                <button id="reset-button" class="button-xl button-secondary" title="Clear Transcript"> 
                    Clear Transcript
                </button>
            </div>
            <div class="col">
                <a class="float-right" href="https://aws.amazon.com/free/" aria-label="Amazon Web Services">
                    <img id="logo" src="AWS_logo_RGB.png" alt="AWS Logo" />
                </a>
            </div>
        </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
          <script src="dist/main.js"></script>

       {this.data}
      </div>
    );
  }
}


export default LCD;


