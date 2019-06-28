/* globals handshake, p2p, chatWindow */

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
    const peer = p2p(socket);

    function startCall(user) {
        if (isInCall) {
            return;
        }

        peer.startCall(user.id, true);
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

