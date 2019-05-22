module.exports = function ({ config, app }) {
    if (config && config.ssl) {
        if(!config.keyLocation || !config.certLocation){
            throw '.cert and .key files must be provided!';
        }

        console.log('creating https server');
        return require('./https-server')({
            app,
            keyLocation: config.keyLocation,
            certLocation: config.certLocation
        });
    }

    console.log('creating http server');
    return require('./http-server')({ app });
};
