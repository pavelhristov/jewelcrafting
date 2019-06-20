/* globals chat */

'use strict';

const container = document.getElementById('container');

container.querySelector('button').addEventListener('click', function (ev) {
    let username = this.previousElementSibling.value || '';
    username = username.trim();
    if (!username || username.length < 3) {
        alert('you need an user name thats lengthier than 3!');
        return false;
    }

    container.innerHTML = ``;
    chat(username);
});

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
