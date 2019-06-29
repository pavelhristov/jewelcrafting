/* globals questions, CALL_REQUEST_RESPONSE */

let handshake = (function () {
    let queued = {};
    let socket;

    function init(gem, validateState) {
        socket = gem;

        socket.on('handshake', function (data) {
            if (data.type === 'asking') {
                if (validateState(data.theme)) { // validates if the user available for the handshake request
                    requestCall(data);
                } else {
                    respond(data.theme, data.from, data.to, CALL_REQUEST_RESPONSE.NOT_AVAILABLE);
                }
            } else if (data.type === 'answering') {
                queued[data.from.id][data.theme](data.response);
                delete queued[data.from.id][data.theme];
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
        socket.emit('handshake', { theme, to: user, type: 'asking' });
    }

    function requestCall(data) {
        questions.ask(data.theme, {
            header: `Incoming ${data.theme}`,
            text: `from ${data.from.name}`,
            actions: [
                { title: 'Accept', handler: () => { respond(data.theme, data.from, data.to, CALL_REQUEST_RESPONSE.ACCEPTED); } },
                { title: 'Decline', handler: () => { respond(data.theme, data.from, data.to, CALL_REQUEST_RESPONSE.DECLINED); } }
            ],
            onTimeout: () => { respond(data.theme, data.from, data.to, CALL_REQUEST_RESPONSE.TIMED_OUT); }
        });
    }

    return {
        init,
        requestHandshake
    };
})();
