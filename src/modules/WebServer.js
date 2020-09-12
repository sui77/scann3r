const http = require('http');
const fs = require('fs');
const _ = require('lodash');

const mimeTypes = {
    jpg: 'image/jpeg',
    png: 'image/png',
    css: 'text/css',
    js: 'text/javascript',
    html: 'text/html',
    zip: 'application/zip',
    svg: 'image/svg+xml'
}

class WebServer {
    constructor(registry) {
        this.server = http.createServer(function (req, res) {
                let file = '' + req.url.replace(/\?.*$/, '');
console.log(file);
console.log( registry.get('config').data.projectsFolder + '/' + file) ;
                if (file == '' || file.match(/\/$/)) {
                    file += 'index.html';
                }

                if (file.match(/config\.json$/)) {
                    res.statusCode = 200;

                    res.setHeader('Content-Type', 'application/json');
                    let page = JSON.stringify(registry.get('config').data);
                    res.write(page);
                    res.end();
                } else if (file.match(/\.\./)) {
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
                } else if (fs.existsSync(registry.get('config').data.projectsFolder + file)) {
                    let ext = file.split('.').pop();

                    res.statusCode = 200;
                    const page = fs.readFileSync(registry.get('config').data.projectsFolder + file);
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
        ).listen(registry.get('config').data.webserver.port);
    }

    getServer() {
        return this.server;
    }
}

module.exports = WebServer;