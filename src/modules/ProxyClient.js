var client = require("socket.io-client");
var fs = require('fs').promises;
const {v4: uuidv4} = require('uuid');
const clients = {}

class ProxyClient {

    constructor(registry, file) {
        this.file = file;
        this.uuid = uuidv4();
        clients[this.uuid] = this;
        for (let n in clients) {
            console.log(n);
        }
        console.log('Serving ' + file + ' at ' + this.uuid );
    }

    start() {
        return new Promise( async(resolve, reject) => {

            let stats = await fs.stat(this.file);
            this.size = stats.size;


            this.socket = client.connect("ws://mc.sui.li:807", {
                path: '/ws',
                reconnection: false,
            });

            this.socket.on('connect_timeout', () => {
                console.log('failed connection');
                reject('Connection timeout.');
            });
            this.socket.on('connect_error', () => {
                console.log('failed connection');
                reject('Connection error.');
            });

            this.socket.on('connect', async () => {
                this.socket.emit(
                    "register",
                    {
                        uuid: this.uuid,
                        size: this.size
                    },
                    (result) => {
                        console.log(result);
                        resolve(result);
                    });
                this.file = await fs.open(this.file, 'r');
                let buffer = Buffer.alloc(100);
            });

            this.socket.on('getData', async (cb) => {
                let buffer = Buffer.alloc(1024 * 1024);
                let data = await this.file.read(buffer, 0, 1024 * 1024);
                cb(data);
            });
        });
    }
}

module.exports = ProxyClient;