const socketIo = require('socket.io');
const Gpio = require('pigpio').Gpio;
const Scan = require('../lib/Scan.js');
const ProxyClient = require('./ProxyClient.js');

class WebSocket {
    constructor( registry) {
        this.config = registry.get('config').data;
        this.registry = registry;
        this.io = socketIo(registry.get('webServer').getServer(), {path: '/ws'});
        this.initHandler();
        this.registerEvents();
    }

    registerEvents() {

        this.registry.get('rotor').onTurn = (displayValue) => {
            this.io.emit('rotor-change', displayValue);
            this.registry.get('config').setConfig('rotor', 'value', displayValue);
        }

        this.registry.get('turntable').onTurn = (displayValue) => {
            this.io.emit('turntable-change', displayValue);
            this.registry.get('config').setConfig('turntable', 'value', displayValue);
        }

        this.registry.get('camera').onSnapDone = (file) => {
            this.io.emit('snap-done', file);
        }
    }

    initHandler() {
        this.io.on('connection', async (socket) => {

        //    this.registry.get('camera').startPreview();

            socket.on('disconnect', () => {

                if (this.io.engine.clientsCount==0) {
                    this.registry.get('camera').stopPreview();
                }
            });

            socket.on('proxy', async (id, cb) => {
               socket.proxyClient = new ProxyClient(this.registry, this.config.projectsFolder + '/' + id + '.zip');
               try {
                   console.log('trystart...');
                   let pdata = await socket.proxyClient.start();
                   console.log('trystart...2');
                   cb( null, pdata);
               } catch(e) {
                   cb('Proxy connection failed', null);
               }

            });

            socket.on('getProjects', async (page, perPage, cb) => {
                console.log('projects', page, perPage);
                let r = this.registry.get('redis');
                let projects = await r.lrange('projects', page*perPage, page*perPage+perPage);
                let result = [];
                for (let n in projects) {
                    console.log( 'project:' + projects[n] );
                    let p = await r.hgetall('project:' + projects[n]);
                    if (p != null) {
                        p.id = projects[n];
                        result.push(p);
                    }
                }
                cb(result);
            });

            socket.on('start', async () => {


                let scan = new Scan(this.registry);
                scan.start();


            });

            socket.on('rotorCalibrate', (steps) => {
                try {
                    this.registry.get('rotor').turnBy(steps);
                } catch (e) {
                    console.log(e);
                }
            });

            socket.on('rotorCalibrateDirection', (data) => {
                console.log('DIR', data);
                this.registry.get('rotor')._config.invert = data;
                this.registry.get('config').setConfig('rotor', 'reverse', data);
            });

            socket.on('rotorCalibrateSetHome', () => {
                this.registry.get('rotor').setHome();
            });

            socket.on('light-slide', (data) => {
                const led1 = new Gpio(this.config.light.pins[1], {mode: Gpio.OUTPUT});
                const led2 = new Gpio(this.config.light.pins[0], {mode: Gpio.OUTPUT});
                if (data == 0) {
                    led1.digitalWrite(0);
                    led2.digitalWrite(0);
                     this.registry.get('config').setConfig('light', 'value', 0);
                } else if (data >=100) {
                    led1.digitalWrite(1);
                    led2.digitalWrite(1);
                     this.registry.get('config').setConfig('light', 'value', 50);
                } else {
                    led1.digitalWrite(0);
                    led2.digitalWrite(1);
                     this.registry.get('config').setConfig('cameraSaturation', 'value', 100);
                }
            });

            socket.on('rotor-change', (data) => {
                try {
                    this.registry.get('rotor').turnTo(data);
                } catch (e) {
                    console.log(e);
                }
            });

            socket.on('turntable-change', (data) => {
                try {
                    this.registry.get('turntable').turnTo(data);
                } catch (e) {

                }
            });

            socket.on('cameraBrightness-slide', (data) => {
                this.registry.get('camera').setSetting('brightness', data);
                this.registry.get('config').setConfig('cameraBrightness', 'value', data);
            });

            socket.on('cameraShutter-slide', (data) => {
                this.registry.get('camera').setSetting('shutter', data);
                this.registry.get('config').setConfig('cameraShutter', 'value', data);
            });

            socket.on('cameraSaturation-slide', (data) => {
                this.registry.get('camera').setSetting('saturation', data);
                this.registry.get('config').setConfig('cameraSaturation','value',  data);

            });

            socket.on('cameraContrast-slide', (data) => {
                this.registry.get('camera').setSetting('contrast', data);
                this.registry.get('config').setConfig('cameraContrast', 'value', data);
            });

            socket.on('rotorAnglesPerScan-change', (data) => {
                 this.registry.get('config').setConfig('rotorAnglesPerScan', 'value', data);
            });

            socket.on('rotorAngleRangeToScan-change', (data) => {
                 this.registry.get('config').setConfig('rotorAngleRangeToScan', 'values', data);
            });

            socket.on('imagesPerRevision-change', (data) => {
                 this.registry.get('config').setConfig('imagesPerRevision', 'value', data);
            });
        });

    }
}

module.exports = WebSocket;