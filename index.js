const SocketIO = require('socket.io');

const app = require('./config/application.js')({});
const server = require('./config/server')({ app });

const io = SocketIO(server, { upgradeTimeout: 30000 });

const PORT = process.env.PORT || 3001;

app.get('/', function (req, res) {
    res.send('index.html');
});

io.on('connection', function (socket) {
    let user = usersList.getUser(socket.handshake.query.id);
    if (!user) {
        socket.emit('user control', { message: 'Session has expired! User not found!' });
        return;
    }

    socket.broadcast.emit('user control', { user, status: 'connected' });
    usersList.connectUser(user.id, socket);

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
            socket.emit('user control', { message: data.userId + ' is offline!' });
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
        let socketId = usersList.getSocketId(data.to.id);
        if (!socketId) {
            socket.emit('user control', { message: data.to.name + ' is offline!' });
            return;
        }

        data.from = user;
        socket.to(`${socketId}`).emit('handshake', data);
    });
});

const usersList = (function () {
    const sockets = {};

    function loginUser(user) {
        sockets[user.id] = {
            user
        };
    }

    function connectUser(userId, socket) {
        sockets[userId].socket = socket;
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

    function getUser(userId) {
        if (sockets[userId]) {
            return sockets[userId].user;
        }
    }

    return {
        loginUser,
        connectUser,
        disconnectUser,
        getLoggedUsers,
        getSocketId,
        getUser
    };
})();

const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(upload.array());

const { guid } = require('./utils/uuid');

app.post('/account/login', function (req, res) {
    if (!req.body.name || req.body.name.length < 3) {
        res.json({ success: false, message: 'Name must be atleast 3 characters long!' });
    }

    if (usersList[req.body.name]) {
        res.json({ success: false, message: 'Name is already taken!' });
    }

    let user = { name: req.body.name, id: guid(), image: './images/profile-pic.png' };
    usersList.loginUser(user);
    res.json({ success: true, user });
});

server.listen(PORT, function () {
    console.log('listening on *:' + PORT);
});

