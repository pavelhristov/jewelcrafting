/* globals console, io, sender, reciever, handshake */

'use strict';

const container = document.getElementById('container');
const MESSAGE_TYPE = {
    SYSTEM: 'system',
    IMAGE: 'image'
};

let gems;
container.querySelector('button').addEventListener('click', function (ev) {
    let username = this.previousElementSibling.value || '';
    username = username.trim();
    if (!username || username.length < 3) {
        alert('you need an user name thats lengthier than 3!');
        return false;
    }

    container.innerHTML = ``;
    gems = setSockets(username, users.showMessage);
});

function setSockets(username, showMessage) {
    const socket = io('', { query: `name=${username}` });
    let videoWrapper;
    handshake.init(socket);

    function sendMessage({ username, message }) {
        socket.emit('chat message', { username, message });
    }

    socket.on('chat message', function (data) {
        showMessage(data.username, data.message, data.type);
    });

    socket.on('user control', function (data) {
        let message = '';
        switch (data.status) {
            case 'connected':
                message = data.username + ' connceted!';
                users.add(data.username);
                break;

            case 'disconnected':
                message = data.username + ' disconnceted!';
                users.remove(data.username);
                break;

            case 'get users':
                data.users.forEach(users.add);
                break;

            default:
                break;
        }

        showMessage(null, message, MESSAGE_TYPE.SYSTEM);
    });

    socket.emit('user control', { status: 'get users' });

    //----------------------------------------------------------------------------
    // const fileInput = container.querySelector('.input-file');
    // fileInput.addEventListener('change', function (ev) {
    //     for (let i = 0; i < this.files.length; i++) {
    //         let file = this.files[i];
    //         if (!file) {
    //             return false;
    //         }

    //         // TODO: stream it, chunk it, slice it, chop it!
    //         let reader = new FileReader();
    //         reader.readAsBinaryString(file);

    //         reader.onload = function () {
    //             let result = btoa(reader.result);
    //             socket.emit('send file', { file: result, type: 'image' });
    //             showMessage(username, result, MESSAGE_TYPE.IMAGE);
    //         };
    //         reader.onerror = function () {
    //             console.error('Error while reading the file!');
    //         };
    //     }
    // });

    // socket.on('send file', function (data) {
    //     showMessage(data.username, data.file, data.type);
    // });

    socket.on('webrtc', function (data) {
        if (data.type === 'setRemoteDescription') {
            if(!videoWrapper){
                videoWrapper = document.createElement('div');
                videoWrapper.classList += 'video-wrapper';
    
                document.querySelector('body').appendChild(videoWrapper);
            }

            let pc = reciever(socket, data.username);
            pc.create();
            pc.registerIceCandidate();
            pc.setRemoteDescription(data.desc);
        }
    });

    function startCallHandler (ev) {
        if(!ev.target || !ev.target.classList || !ev.target.classList.contains('start-call')){
            return;
        }

        let username = ev.target.closest('.chat-wrapper').getAttribute('data-username');
        if (users.isInCall()) {
            return;
        }

        if(!videoWrapper){
            videoWrapper = document.createElement('div');
            videoWrapper.classList += 'video-wrapper';

            document.querySelector('body').appendChild(videoWrapper);
        }

        let s = sender(socket, username);
        s.create();
        s.registerIceCandidate();
        s.createStream();
    }
    //----------------------------------------------------------------------------

    return {
        sendMessage,
        startCallHandler
    };
}

let users = (function () {
    let loggedUsers = {};
    let isInCall = false;
    let usersList = document.createElement('div');
    usersList.classList += 'users-list';
    document.querySelector('body').appendChild(usersList);

    let chatsList = document.createElement('div');
    chatsList.classList += 'chats-list';
    document.querySelector('body').appendChild(chatsList);

    bindEvents();

    function add(username) {
        if (loggedUsers[username]) {
            return;
        }

        loggedUsers[username] = { username };
        let userInfo = document.createElement('div');
        userInfo.textContent = username;
        userInfo.setAttribute('data-username', username);
        userInfo.classList += 'user-info';
        usersList.appendChild(userInfo);
    }

    function remove(username) {
        if (!username) {
            return;
        }

        delete loggedUsers[username];
        let element = usersList.querySelector(`[data-username="${username}"]`);
        if (element) {
            usersList.removeChild(element);
        }
    }

    function bindEvents() {
        usersList.addEventListener('click', function (ev) {
            if (!ev || !ev.target || !ev.target.classList) {
                return;
            }

            if (ev.target.classList.contains('user-info')) {
                let username = ev.target.getAttribute('data-username');
                openChat(username);
            }
        });
    }

    function sendMessageHandler(ev) {
        if (!ev || !ev.target || !ev.target.classList) {
            return;
        }

        if (ev.keyCode === 13 && ev.target.classList.contains('chat-input')) {
            let username = ev.target.closest('.chat-wrapper').getAttribute('data-username');
            let message = ev.target.value;
            if (!message || message.length < 1) {
                return false;
            }

            ev.target.value = '';
            gems.sendMessage({ username, message });
            showMessage(username, message);

            ev.preventDefault();
            return false;
        }
    }

    function openChat(username) {
        let chat = document.querySelector(`.chat-wrapper[data-username="${username}"]`);
        if (chat) {
            loggedUsers[username].chat = chat;
            console.log(`chat for ${username} is already open!`);
            return;
        }

        chat = document.createElement('div');
        chat.classList += 'chat-wrapper';
        chat.setAttribute('data-username', username);

        let header = document.createElement('div');
        header.classList += 'chat-header';
        header.innerText += username;

        let callIcon = document.createElement('button');
        callIcon.innerText = 'start call';
        callIcon.classList += 'start-call';
        callIcon.addEventListener('click', gems.startCallHandler);

        let close = document.createElement('button');
        close.innerText = 'X';
        close.classList += 'close-icon';
        close.addEventListener('click', closeChatHandler);

        header.appendChild(close);
        header.appendChild(callIcon);
        chat.appendChild(header);

        let messages = document.createElement('div');
        messages.classList += 'chat-messages';
        chat.appendChild(messages);

        let chatInputArea = document.createElement('textarea');
        chatInputArea.classList += 'chat-input';
        chatInputArea.addEventListener('keydown', sendMessageHandler);
        chat.appendChild(chatInputArea);

        chatsList.appendChild(chat);
        loggedUsers[username].chat = chat;
    }

    function closeChatHandler(ev) {
        let wrapper = ev.target.closest('.chat-wrapper');
        let username = wrapper.getAttribute('data-username');
        wrapper.parentNode.removeChild(wrapper);

        delete loggedUsers[username].chat;
    }

    function showMessage(username, message, type) {
        console.log(username, message, type);
        if (message.type === MESSAGE_TYPE.SYSTEM || !username || !loggedUsers[username]) {
            return;
        }

        let content = message;
        switch (type) {
            case MESSAGE_TYPE.IMAGE:
                content = `<img src="data:image/jpeg;base64,${message}" height="150" />`;
                break;

            default:
                content = message;
                break;
        }

        let div = document.createElement('div');
        div.classList += 'chat-message';
        div.innerHTML = `
            <img class="chat-message-icon" alt="${username}"/>
            <div class="chat-message-content">${content}</div>
            <div class="chat-message-time">${new Date().toLocaleTimeString()}</div>
        `;

        if (!loggedUsers[username].chat) {
            openChat(username);
        }

        loggedUsers[username].chat.querySelector('.chat-messages').appendChild(div);
    }

    return {
        add, remove, showMessage, loggedUsers,
        isInCall: () => isInCall
    };
})();
