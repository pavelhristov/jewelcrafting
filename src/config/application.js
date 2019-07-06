const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();

module.exports = function () {
    let app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(upload.array());

    app.use(express.static('./public'));
    return app;
};
