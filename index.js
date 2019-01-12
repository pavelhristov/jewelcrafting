const express = require('express');
const http = require('http');
const SocketIO = require('socket.io');

const app = express();
const server = http.Server(app);
const io = SocketIO(server);

const PORT = 3001;

app.use(express.static('./public'));

app.get('/', function (req, res) {
    res.send('index.html');
});

io.on('connection', function (socket) {
    let username = socket.handshake.query.name;
    socket.broadcast.emit('user control', { message: username + ' connected' });

    socket.on('chat message', function (data) {
        socket.broadcast.emit('chat message', { username, message: data.message });
    });

    socket.on('send file', function (data) {
        socket.broadcast.emit('send file', { username, file: data.file, type: data.type });
    });

    socket.on('disconnect', function () {
        socket.broadcast.emit('user control', { message: username + ' disconnected!' });
    });

    socket.on('webrtc', function(data){
        socket.broadcast.emit('webrtc', data);
    })
});

server.listen(PORT, function () {
    console.log('listening on *:' + PORT);
})

