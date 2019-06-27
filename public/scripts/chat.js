/* globals handshake, sender, reciever */

const MESSAGE_TYPE = {
    SYSTEM: 'system',
    IMAGE: 'image'
};

function chat(io, user) {
    //-------------------------------------------------------------------------------
    user.isCurrentUser = true;
    const socket = io('', { query: `name=${user.name}&id=${user.id}` });
    let videoWrapper;
    handshake.init(socket);

    function sendMessage({ user, message }) {
        socket.emit('chat message', { user, message });
    }

    socket.on('chat message', function (data) {
        showMessage(data.user.id, data.message, data.type);
    });

    socket.on('user control', function (data) {
        let message = '';
        switch (data.status) {
            case 'connected':
                message = data.user.name + ' connceted!';
                add(data.user);
                break;

            case 'disconnected':
                message = data.user.name + ' disconnceted!';
                remove(data.user.id);
                break;

            case 'get users':
                data.users.forEach(add);
                break;

            default:
                break;
        }

        showMessage(null, message, MESSAGE_TYPE.SYSTEM);
    });

    socket.emit('user control', { status: 'get users' });

    socket.on('webrtc', function (data) {
        if (data.type === 'setRemoteDescription') {
            if (!videoWrapper) {
                videoWrapper = document.createElement('div');
                videoWrapper.classList += 'video-wrapper';

                document.querySelector('body').appendChild(videoWrapper);
            }

            let pc = reciever(socket, data.userId);
            pc.create();
            pc.registerIceCandidate();
            pc.setRemoteDescription(data.desc);
        }
    });

    function startCall(user) {
        if (isInCall) {
            return;
        }

        if (!videoWrapper) {
            videoWrapper = document.createElement('div');
            videoWrapper.classList += 'video-wrapper';

            document.querySelector('body').appendChild(videoWrapper);
        }

        let s = sender(socket, user.id);
        s.create();
        s.registerIceCandidate();
        s.createStream();
    }
    //----------------------------------------------------------------------------

    let loggedUsers = {};
    let isInCall = false;
    let usersList = document.createElement('div');
    usersList.classList += 'users-list';
    document.querySelector('body').appendChild(usersList);

    let chatsList = document.createElement('div');
    chatsList.classList += 'chats-list';
    document.querySelector('body').appendChild(chatsList);

    bindEvents();

    function add(user) {
        if (loggedUsers[user.id]) {
            return;
        }

        loggedUsers[user.id] = { user };
        let userInfo = document.createElement('div');
        userInfo.textContent = user.name;
        userInfo.setAttribute('data-username', user.name);
        userInfo.setAttribute('data-id', user.id);
        userInfo.classList += 'user-info';
        usersList.appendChild(userInfo);
    }

    function remove(userId) {
        if (!userId) {
            return;
        }

        if (loggedUsers[userId].chat) {
            loggedUsers[userId].chat.close();
        }

        delete loggedUsers[userId];
    }

    function bindEvents() {
        usersList.addEventListener('click', function (ev) {
            if (!ev || !ev.target || !ev.target.classList) {
                return;
            }

            if (ev.target.classList.contains('user-info')) {
                let userId = ev.target.getAttribute('data-id');
                openChat(userId);
            }
        });
    }

    function openChat(userId) {
        if (loggedUsers[userId].chat) {
            console.log(`chat for ${loggedUsers[userId].user.name} is already open!`);
            return;
        }

        let chat = chatWindow(loggedUsers[userId].user, sendMessage, startCall, function () { delete loggedUsers[userId].chat; });
        chatsList.appendChild(chat.ui);
        loggedUsers[userId].chat = chat;
    }

    function showMessage(userId, message, type) {
        if (message.type === MESSAGE_TYPE.SYSTEM || !userId || !loggedUsers[userId]) {
            return;
        }

        if (!loggedUsers[userId].chat) {
            openChat(userId);
        }

        let date = new Date().toLocaleTimeString();
        loggedUsers[userId].chat.showMessage({ user: loggedUsers[userId].user, message, date, type });
    }
}

function chatWindow(user, sendMessage, startCall, onClose) {
    const chat = buildUI(user);

    function buildUI(user) {
        let chat = document.createElement('div');
        chat.classList += 'chat-wrapper';
        chat.setAttribute('data-username', user.name);
        chat.setAttribute('data-id', user.id);

        let header = document.createElement('div');
        header.classList += 'chat-header';
        header.innerText += user.name;

        let callIcon = document.createElement('button');
        callIcon.innerText = 'start call';
        callIcon.classList += 'start-call';
        callIcon.addEventListener('click', handshake.requestHandshake.bind(callIcon, 'call', user, function (response) { 
            if(response === 'Ok'){
                startCall(user);
            }
         }));

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
        return chat;
    }

    function closeChatHandler(ev) {
        chat.parentElement.removeChild(chat);
        if (onClose || typeof onCancel === 'function') {
            onClose();
        }
    }

    function sendMessageHandler(ev) {
        if (!ev || !ev.target || !ev.target.classList) {
            return;
        }

        if (ev.keyCode === 13 && ev.target.classList.contains('chat-input')) {
            let message = ev.target.value;
            if (!message || message.length < 1) {
                return false;
            }

            ev.target.value = '';
            let date = new Date().toLocaleTimeString();
            sendMessage({ user, message, date });
            showMessage({ user, message, date });

            ev.preventDefault();
            return false;
        }
    }

    function showMessage({ user, message, date, type }) {
        if (type === MESSAGE_TYPE.IMAGE) {
            content = `<img src="data:image/jpeg;base64,${content}" height="150" />`;
        }

        let div = document.createElement('div');
        div.classList += 'chat-message';
        let content = `
            <div class="chat-message-content">${message}</div>
            <div class="chat-message-time">${date}</div>
        `;

        if (user.isCurrentUser) {
            content += `<img class="chat-message-icon" src="${user.image | ''}" alt="${user.name}"/>`;
        } else {
            content = `<img class="chat-message-icon" src="${user.image | ''}" alt="${user.name}"/>` + content;
        }

        div.innerHTML = content;
        chat.querySelector('.chat-messages').appendChild(div);
    }

    return { ui: chat, showMessage, close: closeChatHandler };
}
