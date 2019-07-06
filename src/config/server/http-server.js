const http = require('http');

module.exports = function ({ app }) {
    return http.Server(app);
};
