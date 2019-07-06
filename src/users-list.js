module.exports = (function () {
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
