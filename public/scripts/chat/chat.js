/* globals handshake, p2p, chatWindow */

// TODO: move constants
const MESSAGE_TYPE = {
    SYSTEM: 'system',
    IMAGE: 'image'
};

const CALL_REQUEST_RESPONSE = {
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    NOT_AVAILABLE: 'not-available',
    TIMED_OUT: 'timed-out'
};

function chat(io, user) {
    //-------------------------------------------------------------------------------
    const socket = io('', { query: `name=${user.name}&id=${user.id}` });
    let callInfo = { isInCall: false, isCalling: false };
    handshake.init(socket, (requestTheme) => requestTheme === 'call' ? !callInfo.isInCall && !callInfo.isCalling : false);

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
                if (callInfo.isInCall && callInfo.userId === data.user.id) {
                    peer.close();
                    notify(`${data.user.name} was disconnected and the call was closed!`);
                }

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
    const peer = p2p(socket, function (userId) {
        callInfo.isInCall = true;
        callInfo.userId = userId;
    },
        function () {
            callInfo.isInCall = false;
            callInfo.userId = null;
        });

    function requestCall(user, callType) {
        if (callInfo.isInCall) {
            notify('You are already in call!');
            return;
        }

        if (callInfo.isCalling) {
            notify('You are currently calling!');
            return;
        }

        callInfo.isCalling = true;
        handshake.requestHandshake('call', user, function (response) {
            switch (response) {
                case CALL_REQUEST_RESPONSE.ACCEPTED:
                    peer.startCall(user.id, true);
                    break;
                case CALL_REQUEST_RESPONSE.DECLINED:
                    notify(`${user.name} rejected the call request!`);
                    break;
                case CALL_REQUEST_RESPONSE.TIMED_OUT:
                    notify(`Calling ${user.name} timed out!`);
                    break;
                case CALL_REQUEST_RESPONSE.NOT_AVAILABLE:
                    notify(`${user.name} was not available to answer the call!`);
                    break;
                default:
                    notify(`${user.name} was not available to answer the call!`);
                    break;
            }

            callInfo.isCalling = false;
        });
    }
    //----------------------------------------------------------------------------

    let loggedUsers = {};
    let usersList = document.createElement('div');
    usersList.classList += 'users-list';
    document.querySelector('body').appendChild(usersList);

    let chatsList = document.createElement('div');
    chatsList.classList += 'chats-list';
    document.querySelector('body').appendChild(chatsList);

    bindEvents();

    // mockup until notifications are a thing
    function notify(message) {
        console.warn(message);
    }

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
        let element = usersList.querySelector(`[data-id="${userId}"]`);
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

        let chat = chatWindow(loggedUsers[userId].user, user, sendMessage, requestCall, function () { delete loggedUsers[userId].chat; });
        chatsList.appendChild(chat.ui);
        loggedUsers[userId].chat = chat;
    }

    function showMessage(userId, message, type) {
        if (message.type === MESSAGE_TYPE.SYSTEM || !userId || !loggedUsers[userId]) {
            return;
        }
        
        if (type === MESSAGE_TYPE.IMAGE) {
            message = `<img src="data:image/jpeg;base64,${message}" height="150" />`;
        }

        if (!loggedUsers[userId].chat) {
            openChat(userId);
        }

        let date = new Date().toLocaleTimeString();
        loggedUsers[userId].chat.showMessage({ message, date, type });
    }
}

