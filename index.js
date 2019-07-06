const SocketIO = require('socket.io');

const app = require('./src/config/application.js')({});
const server = require('./src/config/server')({ app });

const io = SocketIO(server, { upgradeTimeout: 30000 });

const PORT = process.env.PORT || 3001;

const usersList = require('./src/users-list.js');
require('./src/sockets.js')({ io, usersList });

app.get('/', function (req, res) {
    res.send('index.html');
});

let accountController = require('./src/controllers/account-controller.js')({ usersList });
app.post('/account/login', accountController.loginPost);

server.listen(PORT, function () {
    console.log('listening on *:' + PORT);
});

