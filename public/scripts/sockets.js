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

    socket.on('webrtc', function(data){
        if(data.type === 'setRemoteDescription'){
            let pc = reciever(socket);
            pc.create();
            pc.registerIceCandidate();
            pc.setRemoteDescription2(data.desc);
        }
    });

    container.querySelector('.start-call').addEventListener('click', function (ev) {
        let s = sender(socket);
        s.create();
        s.registerIceCandidate();
        s.createStream();
    });
}
