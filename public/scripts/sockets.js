/* globals io, guid, chat, authorize */

'use strict';

const container = document.getElementById('container');

authorize.setOnLogin(onLogin);
authorize.login(container);

function onLogin (user) {
    container.innerHTML = ``;
    chat(io, user);
}

    //----------------------------------------------------------------------------
    // const fileInput = container.querySelector('.input-file');
    // fileInput.addEventListener('change', function (ev) {
    //     for (let i = 0; i < this.files.length; i++) {
    //         let file = this.files[i];
    //         if (!file) {
    //             return false;
    //         }

    //         // TODO: stream it, chunk it, slice it, chop it!
    //         let reader = new FileReader();
    //         reader.readAsBinaryString(file);

    //         reader.onload = function () {
    //             let result = btoa(reader.result);
    //             socket.emit('send file', { file: result, type: 'image' });
    //             showMessage(username, result, MESSAGE_TYPE.IMAGE);
    //         };
    //         reader.onerror = function () {
    //             console.error('Error while reading the file!');
    //         };
    //     }
    // });

    // socket.on('send file', function (data) {
    //     showMessage(data.username, data.file, data.type);
    // });
