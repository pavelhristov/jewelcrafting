'use strict';

const remoteVideo = document.getElementById('remoteVideo');
const localVideo = document.getElementById('localVideo');
const offerOptions = { offerToReceiveAudio: 1, offerToReceiveVideo: 1 };
const rtcConfig = null;

function onError(error) {
    console.log(error.toString());
}

function gotRemoteStream(ev) {
    remoteVideo.srcObject = ev.streams && ev.streams.length ? ev.streams[0] : ev.stream;
}

function sender(socket) {
    let _stream;
    let pc;
    return {
        create() {
            pc = new RTCPeerConnection(rtcConfig);
            socket.on('webrtc', function (data){
                if(data.type === 'recieverIce'){
                    pc.addIceCandidate(data.candidate);
                }

                if(data.type === 'setRemoteAnswer'){
                    pc.setRemoteDescription(data.desc);
                }
            })
        },
        registerIceCandidate() {
            pc.onicecandidate = function (ev) {
                if (ev.candidate) {
                    socket.emit('webrtc', {type: 'senderIce', candidate: ev.candidate})
                }
            }
        },
        createStream() {
            navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            }).then(function (stream) {
                _stream = stream;
                localVideo.srcObject = stream;

                pc.addStream(_stream);
                return pc.createOffer(offerOptions);
            }).then(function (desc) {
                pc.setLocalDescription(desc);
                socket.emit('webrtc', {type: 'setRemoteDescription', desc });
            }, onError);
        },
        setRemoteDescription(desc) {
            pc.setRemoteDescription(desc);
        },
        get() {
            return pc;
        }
    }
}

function reciever(socket) {
    let pc;
    return {
        create() {
            pc = new RTCPeerConnection(rtcConfig);
            socket.on('webrtc', function (data){
                if(data.type === 'senderIce'){
                    pc.addIceCandidate(data.candidate);
                }
            })
        },
        registerIceCandidate() {
            pc.onicecandidate = function (ev) {
                if (ev.candidate) {
                    socket.emit('webrtc', {type: 'recieverIce', candidate: ev.candidate})
                }
            }
        },
        setRemoteDescription(desc) {
            pc.ontrack = gotRemoteStream;
            pc.setRemoteDescription(desc);

            return pc.createAnswer().then(function (desc) {
                pc.setLocalDescription(desc);

                return desc
            }, onError);
        },
        setRemoteDescription2(desc){
            pc.ontrack = gotRemoteStream;
            pc.setRemoteDescription(desc);

            return pc.createAnswer().then(function (desc) {
                pc.setLocalDescription(desc);

                socket.emit('webrtc', {type: 'setRemoteAnswer', desc });
            }, onError);
        },
        get() {
            return pc;
        }
    }
}

