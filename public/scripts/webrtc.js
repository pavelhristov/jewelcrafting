'use strict';

const remoteVideo = document.getElementById('remoteVideo');
const localVideo = document.getElementById('localVideo');
const offerOptions = { offerToReceiveAudio: 1, offerToReceiveVideo: 1 };

// https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b list of open stun/turn servers
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:numb.viagenie.ca',
            credential: 'muazkh',
            username: 'webrtc@live.com'
        }
    ]
};

function onError(error) {
    console.log(error.toString());
}

function gotRemoteStream(ev) {
    remoteVideo.srcObject = ev.streams && ev.streams.length ? ev.streams[0] : ev.stream;
}

function sender(socket, username) {
    let _stream;
    let pc;
    return {
        create() {
            pc = new RTCPeerConnection(rtcConfig);
            socket.on('webrtc', function (data) {
                if (data.type === 'recieverIce') {
                    pc.addIceCandidate(data.candidate);
                }

                if (data.type === 'setRemoteAnswer') {
                    pc.setRemoteDescription(data.desc);
                }
            });
        },
        registerIceCandidate() {
            pc.onicecandidate = function (ev) {
                if (ev.candidate) {
                    socket.emit('webrtc', { type: 'senderIce', username, candidate: ev.candidate });
                }
            };
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
                socket.emit('webrtc', { type: 'setRemoteDescription', username, desc });
            }, onError);
        },
        setRemoteDescription(desc) {
            pc.ontrack = gotRemoteStream;
            pc.setRemoteDescription(desc);
        }
    };
}

function reciever(socket, username) {
    let pc;
    return {
        create() {
            pc = new RTCPeerConnection(rtcConfig);
            socket.on('webrtc', function (data) {
                if (data.type === 'senderIce') {
                    pc.addIceCandidate(data.candidate);
                }
            });
        },
        registerIceCandidate() {
            pc.onicecandidate = function (ev) {
                if (ev.candidate) {
                    socket.emit('webrtc', { type: 'recieverIce', username, candidate: ev.candidate });
                }
            };
        },
        setRemoteDescription(desc) {
            pc.ontrack = gotRemoteStream;
            pc.setRemoteDescription(desc);
            pc.createAnswer().then(function (desc) {
                pc.setLocalDescription(desc);

                socket.emit('webrtc', { type: 'setRemoteAnswer', username, desc });
            }, onError);
        }
    };
}

