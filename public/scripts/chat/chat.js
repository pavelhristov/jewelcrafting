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

function chat(socket) {
    //-------------------------------------------------------------------------------
    const wrapper = document.querySelector('body');
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
        handshake.requestHandshake(callType === 'video' ? 'video call' : 'call', user, function (response) {
            switch (response) {
                case CALL_REQUEST_RESPONSE.ACCEPTED:
                    peer.startCall(user.id, callType === 'video');
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
    const usersList = createUsersList();
    let chatsList = document.createElement('div');
    chatsList.classList.add('chats-list');
    wrapper.appendChild(chatsList);

    function createUsersList() {
        let usersList = document.createElement('div');
        usersList.classList.add('users-list');
        wrapper.appendChild(usersList);

        return usersList;
    }

    // mockup until notifications are a thing
    function notify(message) {
        console.warn(message);
    }

    function add(user) {
        if (loggedUsers[user.id]) {
            return;
        }

        let userInfo = document.createElement('div');
        userInfo.addEventListener('click', function () { openChat(user.id); });
        userInfo.classList.add('user-info');

        let userName = document.createElement('span');
        userName.classList.add('ellipsis');
        userName.textContent = user.name;
        userInfo.appendChild(userName);

        let userIcon = document.createElement('img');
        userIcon.classList.add('user-icon');
        userIcon.src = user.image || '';
        userIcon.alt = user.name;
        userInfo.appendChild(userIcon);

        usersList.appendChild(userInfo);
        loggedUsers[user.id] = { user, listElement: userInfo };
    }

    function remove(userId) {
        if (!userId || !loggedUsers[userId]) {
            return;
        }

        if (loggedUsers[userId].chat) {
            loggedUsers[userId].chat.close();
        }

        if (loggedUsers[userId].listElement) {
            usersList.removeChild(loggedUsers[userId].listElement);
        }

        delete loggedUsers[userId];
    }

    function openChat(userId) {
        if (loggedUsers[userId].chat) {
            console.log(`chat for ${loggedUsers[userId].user.name} is already open!`);
            return;
        }

        let chat = chatWindow(loggedUsers[userId].user, sendMessage, requestCall, function () { delete loggedUsers[userId].chat; }, sendFile);
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

    //-----------------------------------------------------------------------------------
    // files
    function sendFile(user, file, fileName, fileType) {
        const CHUNK_SIZE = 40000;

        let id = Math.random();
        let chunks = Math.ceil(file.length / CHUNK_SIZE);
        for (let i = 0; i < chunks; i++) {
            let chunk = file.slice(i * CHUNK_SIZE, CHUNK_SIZE + 1);
            socket.emit('send file', { user, chunk: { chunk, chunks, fileName, fileType, chunkNumer: i, fileId: id } });
        }
    }

    socket.on('send file', recieveFile);
    let files = {};
    function recieveFile(data) {
        if (!files[data.chunk.fileId]) {
            files[data.chunk.fileId] = {
                user: data.user,
                totalChunks: data.chunk.chunks,
                chunksLeft: data.chunk.chunks,
                fileName: data.chunk.fileName,
                fileType: data.chunk.fileType,
                chunks: []
            };
        }

        files[data.chunk.fileId].chunks[data.chunk.chunkNumer] = data.chunk.chunk;
        files[data.chunk.fileId].chunksLeft--;
        // TODO: validate if all chunks are loaded, not based on a number
        if (files[data.chunk.fileId].chunksLeft <= 0) {
            let file = files[data.chunk.fileId].chunks.join('');
            let message = '';
            if(files[data.chunk.fileId].fileType.startsWith('image'))
            {
                message = `<img src="data:${files[data.chunk.fileId].fileType};base64,${file}" style="max-width:100%; max-height:200px" />`;
            }

            message += `<span>${files[data.chunk.fileId].fileName}</span>`;            
            if (!loggedUsers[files[data.chunk.fileId].user.id].chat) {
                openChat(files[data.chunk.fileId].user.id);
            }

            let date = new Date().toLocaleTimeString();
            loggedUsers[files[data.chunk.fileId].user.id].chat.showMessage({ message, date });

            delete files[data.chunk.fileId];
        }
    }
}

