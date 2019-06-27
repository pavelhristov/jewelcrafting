/* globals questions */

let handshake = (function () {
    let queued = {};
    let socket;

    function init(gem) {
        socket = gem;

        socket.on('handshake', function (data) {
            if (data.type === 'asking') {
                requestCall(data);
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

    function requestHandshake(theme, user, onReadyHandler) {
        if (!queued[user.id]) {
            queued[user.id] = {};
        }

        if (queued[user.id][theme]) {
            console.log(`handshake for ${theme} with ${user.id}:${user.name} has already been queued`);
            return;
        }

        queued[user.id][theme] = onReadyHandler;
        socket.emit('handshake', { theme, to: user.id, type: 'asking' });
    }

    function requestCall(data) {
        questions.ask(data.theme, {
            header: `Incoming ${data.theme}`,
            text: `from ${data.from}`,
            actions: [
                { title: 'Ok', handler: () => { respond(data.theme, data.from, data.to, 'Ok'); } },
                { title: 'Cancel', handler: () => { respond(data.theme, data.from, data.to, 'Cancel'); } }
            ],
            onTimeout: () => { respond(data.theme, data.from, data.to, 'TimedOut'); }
        });
    }

    return {
        init,
        requestHandshake
    };
})();
