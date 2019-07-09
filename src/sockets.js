module.exports = function ({ io, usersList }) {
    io.on('connection', function (socket) {
        let user = usersList.getUser(socket.handshake.query.id);
        
        //--------------------------------------------------------------------------------
        // system messages
        if (!user) {
            socket.emit('user control', { message: 'Session has expired! User not found!' });
            return;
        }

        socket.broadcast.emit('user control', { user, status: 'connected' });
        usersList.connectUser(user.id, socket);

        socket.on('disconnect', function () {
            socket.broadcast.emit('user control', { user, status: 'disconnected' });
            usersList.disconnectUser(user.id);
        });

        socket.on('user control', function (data) {
            if (data.status === 'get users') {
                let users = usersList.getLoggedUsers(user.id);
                socket.emit('user control', { status: 'get users', users });
            }
        });

        //--------------------------------------------------------------------------------
        // chat messages
        socket.on('chat message', function (data) {
            let socketId = usersList.getSocketId(data.user.id);
            if (!socketId) {
                socket.emit('user control', { message: data.user.name + ' is offline!' });
                return;
            }

            socket.to(`${socketId}`).emit('chat message', { user, message: data.message });
        });

        socket.on('send file', function (data) {
            let socketId = usersList.getSocketId(data.user.id);
            if (!socketId) {
                socket.emit('user control', { message: data.user.name + ' is offline!' });
                return;
            }

            socket.to(`${socketId}`).emit('send file', { user, chunk: data.chunk });
        });

        //--------------------------------------------------------------------------------
        // signaling
        socket.on('webrtc', function (data) {
            let socketId = usersList.getSocketId(data.userId);
            if (!socketId) {
                socket.emit('user control', { message: data.userId + ' is offline!' });
                return;
            }

            data.userId = user.id;
            socket.to(`${socketId}`).emit('webrtc', data);
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
};
