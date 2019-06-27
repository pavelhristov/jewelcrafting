const SocketIO = require('socket.io');

const app = require('./config/application.js')({});
const server = require('./config/server')({ app });

const io = SocketIO(server, { upgradeTimeout: 30000 });

const PORT = process.env.PORT || 3001;

app.get('/', function (req, res) {
    res.send('index.html');
});

io.on('connection', function (socket) {
    let user = {
        name: socket.handshake.query.name,
        id: socket.handshake.query.id
    };
    socket.broadcast.emit('user control', { user, status: 'connected' });
    usersList.connectUser(user, socket);

    socket.on('chat message', function (data) {
        let socketId = usersList.getSocketId(data.user.id);
        if (!socketId) {
            socket.emit('user control', { message: data.user.name + ' is offline!' });
            return;
        }

        socket.to(`${socketId}`).emit('chat message', { user, message: data.message });
    });

    socket.on('send file', function (data) {
        socket.broadcast.emit('send file', { user, file: data.file, type: data.type });
    });

    socket.on('disconnect', function () {
        socket.broadcast.emit('user control', { user, status: 'disconnected' });
        usersList.disconnectUser(user.id);
    });

    socket.on('webrtc', function (data) {
        let socketId = usersList.getSocketId(data.userId);
        if (!socketId) {
            socket.emit('user control', { message: data.user.name + ' is offline!' });
            return;
        }

        data.userId = user.id;
        socket.to(`${socketId}`).emit('webrtc', data);
    });

    socket.on('user control', function (data) {
        if (data.status === 'get users') {
            let users = usersList.getLoggedUsers(user.id);
            socket.emit('user control', { status: 'get users', users });
        }
    });

    socket.on('handshake', function (data) {
        let socketId = usersList.getSocketId(data.to);
        if (!socketId) {
            socket.emit('user control', { message: data.to + ' is offline!' });
            return;
        }

        data.from = user.id;
        socket.to(`${socketId}`).emit('handshake', data);
    });
});

const usersList = (function () {
    const sockets = {};

    function connectUser(user, socket) {
        sockets[user.id] = {
            user,
            socket
        };
    }

    function disconnectUser(userId) {
        delete sockets[userId];
    }

    function getLoggedUsers(userId) {
        return Object.entries(sockets).filter(([k, v]) => k !== userId).map(([k, v]) => v.user);
    }

    function getSocketId(userId) {
        return sockets[userId] && sockets[userId].socket && sockets[userId].socket.id ? sockets[userId].socket.id : undefined;
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

