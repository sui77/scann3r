const log = require('../lib/Log.js').createLogger({name: 'Proxy'});
const {v4: uuidv4} = require('uuid');
const client = require("socket.io-client");
const fs = require('fs').promises;

const STATUS_CREATED = 1;
const STATUS_REGISTERED = 2;
const STATUS_TRANSFERED = 3;
const STATUS_RETURNED = 4;

const BUFFER_SIZE = 1024 * 1024;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Proxy {

    onInfo(msg) {
        // @todo abhängigkeiten nochmal irgendwie sauberer lösen
        this.registry.get('webSocket').toast(msg);
    }

    info(msg) {
        this.onInfo(msg);
    }

    constructor(registry) {
        log.info("Instanciating Proxy " + registry.get('config').get('version'));
        this.io = registry.get('webSocket').io;
        this.registry = registry;
        this.files = {};
        this.socket = null;
        setInterval(() => this.maintenance(), 4000);
    }

    maintenance() {

    }

    async addFile(src, dst) {
        let uuid = uuidv4();
        let stats = await fs.stat(src);
        let size = stats.size;
        this.files[uuid] = {
            uuid: uuid,
            srcName: src,
            srcFileHandle: await fs.open(src, 'r'),
            srcSize: size,
            dstName: dst,
            dstFileHandle: null,
            timeCreated: new Date() / 1000,
            status: STATUS_CREATED,
            registered: false,
        }
        await this.connectToProxy();
        this.socket.emit('register', uuid, size, (err, r) => {
            this.io.emit('proxy', r);
        });
        log.info("Registered file " + uuid);
    }

    disconnected(msg) {
        console.log("X", typeof this.socket, msg);
        this.socket = null;
    }

    async connectToProxy() {

        if (this.socket != null && this.socket.connected) {
            return;
        }

        this.socket = client.connect("ws://mc.sui.li:808", {
            path: '/ws',
            reconnection: false,
            timeout: 2000,
        });

        this.socket.on('connect_timeout', () => {
            console.log('failed connection 1');
            this.disconnected('connect_timeout');
        });
        this.socket.on('connect_error', () => {
            console.log('failed connection 2');
            this.disconnected('connect_error');
        });

        this.socket.on('disconnect', () => {
            console.log('proxy disconnected');
            this.socket = null;
        });

        this.socket.on('getData', async (uid, cb) => {
            let buffer = Buffer.alloc(BUFFER_SIZE);
            let data = await this.files[uid].srcFileHandle.read(buffer, 0, BUFFER_SIZE);
            if (data.bytesRead == 0) {
                this.files[uid].status = STATUS_TRANSFERED;
            }
            cb(data);
        });

        this.socket.on('putData', async (uid, chunk) => {
            if (this.files[uid].dstFileHandle == null) {
                this.files[uid].dstFileHandle = require('fs').createWriteStream(this.files[uid].dstName);
            }
            this.files[uid].dstFileHandle.write(chunk);
        });

        this.socket.on('done', async (uid) => {
            try {
                this.files[uid].dstFileHandle.close();
            } catch (e) {

            }
        });

        for (let n = 0; n < 25; n++) {
            await sleep(100);
            if (this.socket && this.socket.connected) {
                return true;
            }
        }

        throw new Error('noooo');
    }
}

module.exports = Proxy;