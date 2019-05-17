/* globals questions */

let handshake = (function () {
    let queued = {};
    let socket;

    function init(gem) {
        socket = gem;

        socket.on('handshake', function (data) {
            if (data.type === 'asking') {
                questions.ask(data.theme, {
                    header: `Incoming ${data.theme}`,
                    text: `from ${data.from}`,
                    onOk: () => { respond(data.theme, data.from, data.to, 'Ok'); },
                    onCancel: () => { respond(data.theme, data.from, data.to, 'Cancel'); },
                    onIgnore: () => { respond(data.theme, data.from, data.to, 'Ignore'); },
                    onTimeout: () => { respond(data.theme, data.from, data.to, 'TimedOut'); }
                });
            } else if (data.type === 'answering') {
                console.log('answer', data);
                queued[data.from][data.theme](data.response);
                delete queued[data.from][data.theme];
            }
        });
    }

    function respond(theme, to, from, response) {
        socket.emit('handshake', { theme, from, to, response, type: 'answering' });
    }

    function requestHandshake(theme, username, onReadyHandler) {
        if (!queued[username]) {
            queued[username] = {};
        }

        if (queued[username][theme]) {
            console.log(`handshake for ${theme} with ${username} has already been queued`);
            return;
        }

        queued[username][theme] = onReadyHandler;
        socket.emit('handshake', { theme, to: username, type: 'asking' });
    }

    return {
        init,
        requestHandshake
    };
})();
