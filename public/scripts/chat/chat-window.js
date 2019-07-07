/* globals MESSAGE_TYPE */

function chatWindow(user, localUser, sendMessage, requestCall, onClose) {
    const { chat, messages } = buildUI(user);

    function buildUI(user) {
        let chat = document.createElement('div');
        chat.classList.add('chat-wrapper');

        let header = document.createElement('div');
        header.classList.add('chat-header');
        header.innerText += user.name;

        let callIcon = document.createElement('button');
        callIcon.innerText = 'voice call';
        callIcon.classList.add('btn-dark', 'start-call');
        callIcon.addEventListener('click', requestCall.bind(callIcon, user));

        let videoCallIcon = document.createElement('button');
        videoCallIcon.innerText = 'video call';
        videoCallIcon.classList.add('btn-dark', 'start-call');
        videoCallIcon.addEventListener('click', requestCall.bind(videoCallIcon, user, 'video'));

        let close = document.createElement('button');
        close.innerText = 'X';
        close.classList.add('btn-dark', 'close-icon');
        close.addEventListener('click', closeChatHandler);

        header.appendChild(close);
        header.appendChild(callIcon);
        header.appendChild(videoCallIcon);
        chat.appendChild(header);

        let messages = document.createElement('div');
        messages.classList.add('chat-messages');
        chat.appendChild(messages);

        let areaWrapper = document.createElement('div');
        areaWrapper.classList.add('chat-input-wrapper');
        let chatInputArea = document.createElement('textarea');
        chatInputArea.classList.add('input-dark', 'chat-input');
        chatInputArea.addEventListener('keydown', sendMessageHandler);
        areaWrapper.appendChild(chatInputArea);
        chat.appendChild(areaWrapper);
        return { chat, messages };
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
            showLocalMessage({ message, date });

            ev.preventDefault();
            return false;
        }
    }

    // TODO: unify showMessage and showLocalMessage
    function showMessage({ message, date }) {
        let div = document.createElement('div');
        div.classList.add('chat-message');
        div.appendChild(buildIcon(user));
        let messageWrapper = document.createElement('div');
        messageWrapper.innerHTML = `<div class="chat-message-content">${message}</div>
            <div class="chat-message-time">${date}</div>`;

        div.appendChild(messageWrapper);
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight - messages.clientHeight;
    }

    function showLocalMessage({ message, date }) {
        let div = document.createElement('div');
        div.classList.add('chat-message', 'local-chat-message');
        let messageWrapper = document.createElement('div');
        messageWrapper.innerHTML = `<div class="chat-message-content">${message}</div>
            <div class="chat-message-time">${date}</div>`;

        div.appendChild(messageWrapper);
        div.appendChild(buildIcon(localUser));
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight - messages.clientHeight;
    }

    function buildIcon(user) {
        let img = document.createElement('img');
        img.classList.add('user-icon', 'chat-message-icon');
        img.src = user.image || '';
        img.alt = user.name;

        return img;
    }

    return { ui: chat, showMessage, showLocalMessage, close: closeChatHandler };
}
