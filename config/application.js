const express = require('express');

module.exports = function () {
    let app = express();

    app.use(express.static('./public'));
    return app;
};
