import React, { useEffect, useReducer, useState } from 'react';

import API, { graphqlOperation } from '@aws-amplify/api';
import Amplify, { PubSub, Predictions } from 'aws-amplify';
import { AWSIoTProvider } from '@aws-amplify/pubsub/lib/Providers';
import { AmazonAIPredictionsProvider } from '@aws-amplify/predictions';


import TextLoop from "react-text-loop";
import cxs from "cxs/component";

import { Textfit } from 'react-textfit';
import OccamyText from 'react-occamy-text';

import Modal from 'react-awesome-modal';
import IframeComponent from './lib/IframeComponent';

import { Box,Grommet } from 'grommet';

import mic from 'microphone-stream';
import $ from 'jquery';
import streamAudioToWebSocket from  "./lib/main.js";
import showError from  "./lib/main.js";
import { startbutton } from "./lib/main.js";
import { resetbutton } from "./lib/main.js";


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


var pubSubsensoff = async () => {
    await Amplify.PubSub.publish('lcd-message', { message: '', presence: 0 });
}

var sensoron = async () => {
    await Amplify.PubSub.publish('lcd-message', { message: '', presence: 1 });
}

var messagesession = async () => {
    await Amplify.PubSub.publish('lcd-message', { message: 'The session ML305 - How to become the leader in your DeepRacer league is located at the Aria - Pledingo323 room ', presence: "request" });
}

var messagemap = async () => {
    await Amplify.PubSub.publish('lcd-message', { message: '', presence: 1, mapvue: 'true', mapurl: 'www.google.com' });
}

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
    status: 0,
    startbact: '',
    visiblemap : false,
    mapurl: null
  }
  
  componentDidMount() {
    this.getSub()
    
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
    var mapdisplay = objectValue['value'].mapvue;
    console.log('mapdisplay: ', mapdisplay)
    var mapaddress = objectValue['value'].mapurl;
    console.log('mapaddress: ', mapaddress);
    this.setState({datalcd: messageiot, status: presenceiot, visiblemap: mapdisplay, mapurl: mapaddress});
  },
  error: error => console.error(error),
  close: () => console.log('Done'),
});
  }

    openModal() {
        this.setState({
            visible : true
        });
    }
 
    closeModal() {
        this.setState({
            visiblemap : false
        });
    }

  render(){
    const {datalcd, status, startbact, visible} = this.state;
      const { loading } = this.state;
    const welcome = 'How can I help?';
    return (
      <div className="App"style = {{height:"130vh", justifyContent: 'center'}}>
      <textarea id="transcript" placeholder="Real Time transcribe stream" rows="1"
      readonly="readonly"></textarea>


               <div className="occamy-text-example">
                <div className="box">
                      {(status === 0) ? <OccamyText maxFontSize='150'><h3><TextLoop interval='4000' fade='true' children={["ASK ME", <img src={AWS_logo} alt="Logo" height="150%" width="150%" />]} /></h3></OccamyText> : null}
                      {(status === 1) ? <OccamyText><h3>My name is AVA.<br/>
      How can I help?</h3></OccamyText> : null }
                      {(status === "request") ? <OccamyText><h3>{datalcd}</h3></OccamyText>: null}
                </div>
              </div>
                            
              <section>
                <h1></h1>
                <input type="button" value="Open" onClick={() => this.openModal()} />
                <Modal visible={this.state.visiblemap} width="1200" height="600" effect="fadeInUp" onClickAway={() => this.closeModal()}>
                    <div>
                        <IframeComponent src="https://maps.mapwize.io/#/f/p/mgmmap1/room104/t/p/mgmmap1/dining_hall?k=f0b3b38e6081057f&u=default_universe&l=en&z=17.937&modeId=5e70d546cdd99a0016bc0a37" height="600" width="1200"/>
                        <a href="javascript:void(0);" onClick={() => this.closeModal()}>Close</a>
                    </div>
                </Modal>
            </section>
          
       {/* DEBUG SECTION*/}
        <div class="row">
            <div class="col">
                <button onClick={startbutton} class="button-xl" title="Start Transcription">
                    <i className="fa fa-microphone"></i> Start
                </button>
                <button id="stop-button" class="button-xl" title="Stop Transcription" disabled="true"><i
                        class="fa fa-stop-circle"></i> Stop
                </button>
                <button onClick={resetbutton} class="button-xl button-secondary" title="Clear Transcript"> 
                    Clear Transcript
                </button>
            </div>
                        <div class="col">
                <button onClick={pubSubsensoff} class="button-xl" title="Sensor clear">
                    <i className="fa fa-microphone"></i> Sensor clear
                </button>
                <button onClick={sensoron} class="button-xl" title="Sensor prs detected"><i
                        class="fa fa-stop-circle"></i> Sensor on
                </button>
                <button onClick={messagesession} class="button-xl button-secondary" title="Msg session"> 
                    Msg session
                </button>
                <button onClick={messagemap} class="button-xl button-secondary" title="Msg map"> 
                    Msg map
                </button>

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


