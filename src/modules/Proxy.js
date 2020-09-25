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
        console.log(Object.keys(this.files).length);
    }

    async addFile(project) {
        let uuid = uuidv4();
        let src = project.getZipFileLocation();
        let stats = await fs.stat(src);
        let size = stats.size;

        this.files[uuid] = {
            project: project,
            uuid: uuid,
            projectId: await project.get('id'),
            srcName: src,
            srcFileHandle: await fs.open(src, 'r'),
            srcSize: size,
            srcTransfered: 0,
            dstName: project.getPath() + '/' + uuid + '.zip',
            dstTransfered: 0,
            dstFileHandle: null,
            timeCreated: new Date() / 1000,
            status: STATUS_CREATED,
            registered: false,
        }
        await this.connectToProxy();
        this.socket.emit('register', uuid, size, (err, r) => {
            if (!err) {
                this.io.emit('proxy', r);
                this.files[uuid].status = STATUS_REGISTERED;
            } else {
                this.registry.get('notification').notify('error-' + uuid, 'Error', 'Proxy error: ' + err, 0, false);

            }
        });
        log.info("Registered file " + uuid);
    }

    disconnected(msg) {
        this.registry.get('notification').notify('error-proxy', 'Error', 'Proxy error: ' + msg, 0, false);
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
            let me = this.files[uid];
            let buffer = Buffer.alloc(BUFFER_SIZE);
            let data = await me.srcFileHandle.read(buffer, 0, BUFFER_SIZE);
            me.srcTransfered += data.bytesRead;
            if (data.bytesRead == 0) {
                me.status = STATUS_TRANSFERED;
                this.registry.get('notification').close('cloudUp-' + uid);
                me.srcFileHandle.close();
            } else {
                let percent = (100 / me.srcSize * me.srcTransfered).toFixed(0);
                this.registry.get('notification').notify('cloudUp-' + uid, 'Cloud transfer', 'Uploading #' + me.projectId + ' (' + percent + '%)', percent, true);

            }


            cb(data);
        });

        this.socket.on('putData', async (uid, size, chunk) => {

            let me = this.files[uid];
            if (me.dstFileHandle == null) {
                me.dstFileHandle = require('fs').createWriteStream(me.dstName);
            }
            me.dstFileHandle.write(chunk);

            me.dstTransfered += chunk.length * 1;
            let percent = (100 / size * me.dstTransfered).toFixed(0);
            this.registry.get('notification').notify('cloudDown-' + uid, 'Cloud transfer', 'Receiving  #' + me.projectId + ' (' + percent + '%)', percent, true);
        });

        this.socket.on('done', async (uid) => {
            let me = this.files[uid];
            this.registry.get('notification').notify('cloudDown-' + uid, 'Cloud transfer', `Received <a href="${me.projectId}/${uid}.zip">result zip</a> for #${me.projectId}`, 100, true);
            me.project.addResultZip(uid + ".zip");
            try {
                me.dstFileHandle.close();
            } catch (e) {

            }
            delete this.files[uid];
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