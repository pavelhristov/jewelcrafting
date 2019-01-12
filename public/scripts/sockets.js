'use strict';

const container = document.getElementById('container');
const MESSAGE_TYPE = {
    SYSTEM: 'system',
    IMAGE: 'image'
}

container.querySelector('button').addEventListener('click', function (ev) {
    let username = this.previousElementSibling.value || '';
    username = username.trim();
    if (!username || username.length < 3) {
        alert('you need an user name thats lengthier than 3!');
        return false;
    }

    container.innerHTML = `
    <div>
        <div class="messages"></div>
        <input class="input-message"/>
        <button class="btn-message">Send Message</button>

        <br>
        <input type="file" class="input-file" accept="image/*"/>
        <button class="start-call">Start Call</button>
        <video autoplay playsinline></video>
    </div>`;
    setSockets(username);
});

function setSockets(username) {
    const socket = io('', { query: `name=${username}` });

    const input = container.querySelector('.input-message');
    container.querySelector('.btn-message').addEventListener('click', function (ev) {
        let message = input.value;
        if (!message || message.length < 1) {
            return false;
        }

        input.value = '';
        socket.emit('chat message', { message });
        showMessage(username, message);
    });

    socket.on('chat message', function (data) {
        showMessage(data.username, data.message);
    });

    socket.on('user control', function (data) {
        showMessage(null, data.message, MESSAGE_TYPE.SYSTEM);
    });

    let messagesContainer = container.querySelector('.messages');
    function showMessage(username, message, type) {
        let content = '';
        switch (type) {
            case MESSAGE_TYPE.SYSTEM:
                content = `<i>${message}</i>`;
                break;
            case MESSAGE_TYPE.IMAGE:
                content = `${username}: <img src="data:image/jpeg;base64,${message}" height="150" />`;
                break;

            default:
                content = `${username}: ${message}`;
                break;
        }

        let div = document.createElement('div');
        div.innerHTML = content;
        messagesContainer.appendChild(div);
    }


    const fileInput = container.querySelector('.input-file');
    fileInput.addEventListener('change', function (ev) {
        let file = fileInput.files[0];
        if (!file) {
            return false;
        }

        // TODO: stream it, chunk it, slice it, chop it!
        let reader = new FileReader();
        reader.readAsBinaryString(file);

        reader.onload = function () {
            let result = btoa(reader.result)
            socket.emit('send file', { file: result, type: 'image' });
            showMessage(username, result, MESSAGE_TYPE.IMAGE);
        };
        reader.onerror = function () {
            console.error('Error while reading the file!');
        };
    });

    socket.on('send file', function (data) {
        showMessage(data.username, data.file, data.type);
    });

    let pc;
    container.querySelector('.start-call').addEventListener('click', function (ev) {
        start(socket).then(function (res) {
            pc = res;
        });
    });

    let remoteVideo = container.querySelector('video');
    socket.on('webrtc', function (data) {
        console.log(data);
        if (!pc) {
            pc = new RTCPeerConnection(null);
        }

        if (data.type === 'addIceCandidate') {
            pc.onicecandidate = function (ev) {
                socket.emit('webrtc', { type: 'addIceCandidate', candidate: ev.candidate });
            };

            pc.ontrack = function (ev) {
                remoteVideo.srcObject = ev.streams && ev.streams.length ? ev.streams[0] : ev.stream;
            };

            return;
        }

        if (data.type === 'setRemoteDescription') {
            pc.setRemoteDescription(data.desc).then(function (err) {
                console.log(err)
            }, function (err) { console.log(err) });

            pc.createAnswer().then(function (desc) {
                return pc.setLocalDescription(desc).then(function () {
                    socket.emit('webrtc', { type: 'setRemoteAnswer', desc });
                });
            }, function (err) { console.log(err) });

            return;
        }

        if (data.type === 'setRemoteAnswer') {
            console.log(pc);
            pc.setRemoteDescription(data.desc);
            return;
        }
    })
}

function startCall(stream, socket) {
    var servers = null;
    let pc = new RTCPeerConnection(servers);
    pc.onicecandidate = function (ev) {
        socket.emit('webrtc', { type: 'addIceCandidate', candidate: ev.candidate });
    };

    pc.addStream(stream);
    pc.createOffer({
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 1
    }).then(function (desc) {
        pc.setLocalDescription(desc).then(function () {
            socket.emit('webrtc', { type: 'setRemoteDescription', desc });
        });
    }, function (err) { console.log(err) });

    return pc;
}

function start(socket) {
    return navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    }).then(function (res) {
        container.querySelector('video').srcObject = res;
        return startCall(res, socket);
    });
}
