const audioUtils        = require('./audioUtils');  // for encoding audio data as PCM
const crypto            = require('crypto'); // tot sign our pre-signed URL
const v4                = require('./aws-signature-v4'); // to generate our pre-signed URL
const marshaller        = require("@aws-sdk/eventstream-marshaller"); // for converting binary event stream messages to and from JSON
const util_utf8_node    = require("@aws-sdk/util-utf8-node"); // utilities for encoding and decoding UTF8
const mic               = require('microphone-stream'); // collect microphone input as a stream of raw bytes
const $                 = require('jquery');
const AWS                 = require('aws-sdk');

// our converter between binary event streams messages and JSON
const eventStreamMarshaller = new marshaller.EventStreamMarshaller(util_utf8_node.toUtf8, util_utf8_node.fromUtf8);
var lexruntime = new AWS.LexRuntime();
    
// our global variables for managing state
let languageCode;
let region;
let sampleRate;
let transcription = "";
let socket;
let micStream;
let socketError = false;
let transcribeException = false;



// check to see if the browser allows mic access
if (!window.navigator.mediaDevices.getUserMedia) {
    // Use our helper method to show an error on the page
    showError('We support the latest versions of Chrome, Firefox, Safari, and Edge. Update your browser and try your request again.');

    // maintain enabled/distabled state for the start and stop buttons
    toggleStartStop();
}

    export function startbutton () {
    console.log("buttontest1");
    toggleStartStop(true); // disable start and enable stop button

    // set the language and region from the dropdowns
    setLanguage();
    setRegion();

    // first we get the microphone input from the browser (as a promise)...
    //window.navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(streamAudioToWebSocket)
        // ...then we convert the mic stream to binary event stream messages when the promise resolves 
        //.catch(function (error) {
        //    console.log("ERROR");
        //    showError('There was an error streaming your audio to Amazon Transcribe. Please try again.');
        //    toggleStartStop();
        //});
        streamAudioToWebSocket();
};

//LEX INIT
var stl = function sendToLex(message) {


    var params = {
        botAlias: 'dev', /* required, has to be '$LATEST' */
        botName: 'CoffeeBot', /* required, the name of you bot */
        inputText: message, /* required, your text */
        userId: 'USER', /* required, arbitrary identifier */
    }

    lexruntime.postText(params, (err, data) => {
            if(err) {
                // TODO SHOW ERROR ON MESSAGES
            }
            if (data) {
                this.showResponse(data)
            }
        })
}

//LEX END INIT

let streamAudioToWebSocket = function (userMediaStream) {
    //let's get the mic input from the browser, via the microphone-stream module
    //console.log("streamAudioToWebSocket");
    window.navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then((stream) => {
    micStream = new mic();
    micStream.setStream(stream);
    //console.log("buttontest2");

    // Pre-signed URLs are a way to authenticate a request (or WebSocket connection, in this case)
    // via Query Parameters. Learn more: https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
    let url = createPresignedUrl();

    //open up our WebSocket connection
        socket = new WebSocket(url);
    //console.log("socket return: ", socket);
    socket.binaryType = "arraybuffer";

    // when we get audio data from the mic, send it to the WebSocket if possible
    socket.onopen = function() {
        //console.log("micstream.on test2a");
        micStream.on('data', (chunk) => {
          //console.log("micstream.on test2b");
          var raw = mic.toRaw(chunk);
          //console.log("micstream.on test3");
          if (raw == null) {
            return;
          }
        console.log("binary1: ");
          var binary = convertAudioToBinaryMessage(raw);
          //console.log("binary2: ", binary);
            
                if (socket.OPEN) {
                console.log("socket");
                socket.send(binary);
            };
        });
//        micStream.on('data', function(rawAudioChunk) {
//                console.log("rawAudioChunk:", rawAudioChunk);
//            // the audio stream is raw audio bytes. Transcribe expects PCM with additional metadata, encoded as binary
//                let binary = convertAudioToBinaryMessage(rawAudioChunk);
//                console.log("binary2: ", binary);
                

        };
        
        socket.onerror = function () {
        socketError = true;
        showError('WebSocket connection error. Try again.');
        console.log("WebSocket connection error. Try again.");
        toggleStartStop();
    };
    
        socket.onclose = function (closeEvent) {
        //console.log("micStream.stop: ", closeEvent);
        micStream.stop();
        }

    // handle messages, errors, and close events
    wireSocketEvents();
    });
}

function setLanguage() {
    //languageCode = $('#language').find(':selected').val();
    languageCode = "en-US" 
    if (languageCode == "en-US" || languageCode == "es-US")
        sampleRate = 44100;
    else
        sampleRate = 8800;
}

function setRegion() {
    //region = $('#region').find(':selected').val();
    region = 'us-east-1';
}

function wireSocketEvents() {
    //console.log("wiresocketEvent test");
    // handle inbound messages from Amazon Transcribe
    socket.onmessage = function (message) {
        //convert the binary event stream message to JSON
        //console.log("message.data :", message.data);
        let messageWrapper = eventStreamMarshaller.unmarshall(Buffer(message.data));
        //console.log("messageWrapper", messageWrapper);
        let messageBody = JSON.parse(String.fromCharCode.apply(String, messageWrapper.body));
        //console.log("headers: ", messageWrapper.headers[":message-type"].value);
        if (messageWrapper.headers[":message-type"].value === "event") {
            //console.log("messageWrapper.headers");
            handleEventStreamMessage(messageBody);
        }
        else {
            console.log("messageWrapper.error");
            transcribeException = true;
            showError(messageBody.Message);
            toggleStartStop();
        }
    };

    socket.onerror = function () {
        socketError = true;
        showError('WebSocket connection error. Try again.');
        console.log("WebSocket connection error. Try again.");
        toggleStartStop();
    };
    
    socket.onclose = function (closeEvent) {
        console.log("micStream.stop: ", closeEvent);
        micStream.stop();
        
        // the close event immediately follows the error event; only handle one.
        if (!socketError && !transcribeException) {
            if (closeEvent.code != 1000) {
                showError('</i><strong>Streaming Exception</strong><br>' + closeEvent.reason);
            }
            toggleStartStop();
        }
    };
}

let handleEventStreamMessage = function (messageJson) {
    let results = messageJson.Transcript.Results;


    if (results.length > 0) {
        if (results[0].Alternatives.length > 0) {
            let transcript = results[0].Alternatives[0].Transcript;

            // fix encoding for accented characters
            transcript = decodeURIComponent(escape(transcript));
            console.log('transcript: ', transcript);

            // update the textarea with the latest result
            $('#transcript').val(transcription + transcript + "\n");

            // if this transcript segment is final, add it to the overall transcription
            if (!results[0].IsPartial) {
                //scroll the textarea down
                console.log('transcript[0]:', results[0]);
                //HERE TO SEND TO LEX
                closeSocket();
                stl(results[0]);
                
                $('#transcript').scrollTop($('#transcript')[0].scrollHeight);

                transcription += transcript + "\n";
            }
        }
    }
}

let closeSocket = function () {
    if (socket.OPEN) {
        micStream.stop();

        // Send an empty frame so that Transcribe initiates a closure of the WebSocket after submitting all transcripts
        let emptyMessage = getAudioEventMessage(Buffer.from(new Buffer([])));
        let emptyBuffer = eventStreamMarshaller.marshall(emptyMessage);
        socket.send(emptyBuffer);
    }
    else console.log('already closed');
}

export function stopbutton () {
    closeSocket();
    toggleStartStop();
};

export function resetbutton () {
    $('#transcript').val('');
    transcription = '';
};

function toggleStartStop(disableStart = false) {
    $('#start-button').prop('disabled', disableStart);
    $('#stop-button').attr("disabled", !disableStart);
}

function showError(message) {
    $('#error').html('<i class="fa fa-times-circle"></i> ' + message);
    $('#error').show();
}

function convertAudioToBinaryMessage(audioChunk) {
    console.log("start convertAudioToBinaryMessage");
    let raw = mic.toRaw(audioChunk);

    if (raw == null) {
        console("raw null");
        return;
    }

    console.log("raw not null");
    // downsample and convert the raw audio bytes to PCM
    let downsampledBuffer = audioUtils.downsampleBuffer(raw, sampleRate);
    let pcmEncodedBuffer = audioUtils.pcmEncode(downsampledBuffer);

    // add the right JSON headers and structure to the message
    let audioEventMessage = getAudioEventMessage(Buffer.from(pcmEncodedBuffer));
    //console.log('audioeventmessage: ', audioEventMessage);

    //convert the JSON object + headers into a binary event stream message
    let binary = eventStreamMarshaller.marshall(audioEventMessage);
    //console.log("binary :", binary);
    return binary;
}

function getAudioEventMessage(buffer) {
    // wrap the audio data in a JSON envelope
    return {
        headers: {
            ':message-type': {
                type: 'string',
                value: 'event'
            },
            ':event-type': {
                type: 'string',
                value: 'AudioEvent'
            }
        },
        body: buffer
    };
}

function createPresignedUrl() {
    let endpoint = "transcribestreaming." + region + ".amazonaws.com:8443";

    // get a preauthenticated URL that we can use to establish our WebSocket
    return v4.createPresignedURL(
        'GET',
        endpoint,
        '/stream-transcription-websocket',
        'transcribe',
        crypto.createHash('sha256').update('', 'utf8').digest('hex'), {
            'key': $('#access_id').val(),
            'secret': $('#secret_key').val(),
            'sessionToken': $('#session_token').val(),
            'protocol': 'wss',
            'expires': 15,
            'region': region,
            'query': "language-code=" + languageCode + "&media-encoding=pcm&sample-rate=" + sampleRate
        }
    );
}
