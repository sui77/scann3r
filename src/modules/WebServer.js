const http = require('http');
const fs = require('fs');
const _ = require('lodash');
const log = require('bunyan').createLogger({name: 'WebServer'});

const mimeTypes = {
    jpg: 'image/jpeg',
    png: 'image/png',
    css: 'text/css',
    js: 'text/javascript',
    html: 'text/html',
    zip: 'application/zip',
    svg: 'image/svg+xml'
};

class WebServer {

    constructor(registry) {

        let port = registry.get('config').get('webserver.port');

        this.server = http.createServer(function (req, res) {
                //log.info(req.method + ' ' + req.url);
                let file = '' + req.url.replace(/\?.*$/, '');

                if (file == '' || file.match(/\/$/)) {
                    file += 'index.html';
                }

                if (file.match(/\.\./)) {
                    res.statusCode = 403;
                    res.setHeader('Content-Type', 'text/html');
                    res.write("403 forbidden\n");
                    res.end();
                } else if (fs.existsSync('./public_html' + file)) {
                    let ext = file.split('.').pop();

                    res.statusCode = 200;
                    const page = fs.readFileSync('./public_html' + file);
                    res.setHeader('Content-Type', _.get(mimeTypes, ext, 'application/octetstream'));
                    res.write(page);
                    res.end();
                } else if (fs.existsSync(registry.get('config').get('misc.projectsFolder') + file)) {
                    let ext = file.split('.').pop();

                    res.statusCode = 200;
                    const page = fs.readFileSync(registry.get('config').get('misc.projectsFolder') + file);
                    res.setHeader('Content-Type', _.get(mimeTypes, ext, 'application/octetstream'));
                    res.write(page);
                    res.end();
                } else {
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'text/html');
                    res.write("404 not found\n");
                    res.end();
                }

            }
        ).listen(port);
        log.info(`Listening on port ${port}`);
    }

    getServer() {
        return this.server;
    }
}

module.exports = WebServer;