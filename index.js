const http = require('http');
const SocketIO = require('socket.io');

const app = require('./config/application.js')({});
const server = http.Server(app);
const io = SocketIO(server, { upgradeTimeout: 30000 });

const PORT = process.env.PORT || 3001;

app.get('/', function (req, res) {
    res.send('index.html');
});

io.on('connection', function (socket) {
    let username = socket.handshake.query.name;
    socket.broadcast.emit('user control', { username, status: 'connected' });
    usersList.connectUser(username, socket);

    socket.on('chat message', function (data) {
        let socketId = usersList.getSocketId(data.username);
        if (!socketId) {
            socket.emit('user control', { message: data.username + ' is offline!' });
            return;
        }

        socket.to(`${socketId}`).emit('chat message', { username, message: data.message });
    });

    socket.on('send file', function (data) {
        socket.broadcast.emit('send file', { username, file: data.file, type: data.type });
    });

    socket.on('disconnect', function () {
        socket.broadcast.emit('user control', { username, status: 'disconnected' });
        usersList.disconnectUser(username);
    });

    socket.on('webrtc', function (data) {
        let socketId = usersList.getSocketId(data.username);
        if (!socketId) {
            socket.emit('user control', { message: data.username + ' is offline!' });
            return;
        }

        data.username = username;
        socket.to(`${socketId}`).emit('webrtc', data);
    });

    socket.on('user control', function (data) {
        if (data.status === 'get users') {
            let users = usersList.getLoggedUsers(username);
            socket.emit('user control', { status: 'get users', users });
        }
    });
});

const usersList = (function () {
    const sockets = {};

    function connectUser(username, socket) {
        sockets[username] = socket;
    }

    function disconnectUser(username) {
        delete sockets[username];
    }

    function getLoggedUsers(username) {
        let users = Object.keys(sockets);
        if (username) {
            var index = users.indexOf(username);
            if (index !== -1) {
                users.splice(index, 1);
            }
        }

        return users || [];
    }

    function getSocketId(username) {
        return sockets[username] && sockets[username].id ? sockets[username].id : undefined;
    }

    return {
        connectUser,
        disconnectUser,
        getLoggedUsers,
        getSocketId
    };
})();

server.listen(PORT, function () {
    console.log('listening on *:' + PORT);
});

