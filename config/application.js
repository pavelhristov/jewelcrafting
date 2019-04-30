const express = require('express');

module.exports = function ({ data }) {
    let app = express();

    app.use(express.static('./public'));
    return app;
};
