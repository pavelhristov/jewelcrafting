/* globals handshake, MESSAGE_TYPE */

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
