const https = require('https');
const fs = require('fs');

module.exports = function ({ app, keyLocation, certLocation }) {
    const key = fs.readFileSync(keyLocation);
    const cert = fs.readFileSync(certLocation);
    const options = { key, cert };

    return https.createServer(options, app);
};
