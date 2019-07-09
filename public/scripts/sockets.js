/* globals io, chat, authorize */

'use strict';

const container = document.getElementById('container');

authorize.setOnLogin(onLogin);
authorize.login(container);

function onLogin (user) {
    container.innerHTML = ``;
    const socket = io('', { query: `name=${user.name}&id=${user.id}` });
    chat(socket);
}
