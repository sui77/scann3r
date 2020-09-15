const socketIo = require('socket.io');
const Scan = require('../lib/Scan.js');
const ProxyClient = require('./ProxyClient.js');


class WebSocket {


    constructor(registry) {
        this.config = registry.get('config').data;
        this.registry = registry;
        this.io = socketIo(registry.get('webServer').getServer(), {path: '/ws'});
        this.initHandler();
        this.registerEvents();

        const cameraSetting = (param, value) => {
            this.registry.get('camera').setSetting(param, value);
            this.registry.get('config').setConfig(param, 'value', value);
        }

        const stepperTurnTo = (stepper, value) => {
            try {
                stepper.turnTo(value);
            } catch (e) {
                console.log(e);
            }
        }

        const miscSetting = (param, value) => {
            this.registry.get('config').setConfig(param, 'value', value);
        }

        const miscSettings = (param, value) => {
            this.registry.get('config').setConfig(param, 'values', value);
        }

        this.change = {
            rotor: (value) => {
                stepperTurnTo(this.registry.get('rotor'), value);
            },
            turntable: (value) => {
                stepperTurnTo(this.registry.get('turntable'), value);
            },

            shutter: (value) => {
                cameraSetting('shutter', value)
            },
            brightness: (value) => {
                cameraSetting('brightness', value)
            },
            contrast: (value) => {
                cameraSetting('contrast', value)
            },
            saturation: (value) => {
                cameraSetting('saturation', value)
            },
            light: (value) => {
                this.registry.get('config').setConfig('light', 'value', value);
                this.registry.get('gpio').light1.write(((value == 1 || value == 2) * 1));
                this.registry.get('gpio').light2.write((value == 2) * 1);
            },
            imagesPerRevision: (value) => {
                miscSetting('imagesPerRevision', value)
            },
            rotorAnglesPerScan: (value) => {
                miscSetting('rotorAnglesPerScan', value)
            },
            rotorAngleRangeToScan: (value) => {
                miscSettings('rotorAngleRangeToScan', value)
            },
        };

        this.slide = {
            shutter: this.change.shutter,
            brightness: this.change.brightness,
            contrast: this.change.contrast,
            saturation: this.change.saturation,
        };
    }


    registerEvents() {

        this.registry.get('rotor').onTurn = (displayValue) => {
            this.io.emit('slider-change', 'rotor', displayValue);
            this.registry.get('config').setConfig('rotor', 'value', displayValue);
        }

        this.registry.get('turntable').onTurn = (displayValue) => {
            this.io.emit('slider-change', 'turntable', displayValue);
            this.registry.get('config').setConfig('turntable', 'value', displayValue);
        }

        this.registry.get('camera').onSnapDone = (file) => {
            this.io.emit('snap-done', file);
        }
    }

    changeCameraContrast(val) {

    }


    initHandler() {
        this.io.on('connection', async (socket) => {

            this.registry.get('camera').startPreview();

            socket.on('disconnect', () => {

                if (this.io.engine.clientsCount == 0) {
                    this.registry.get('camera').stopPreview();
                }
            });

            socket.on('proxy', async (id, cb) => {
                socket.proxyClient = new ProxyClient(this.registry, this.config.projectsFolder + '/' + id + '.zip');
                try {
                    console.log('trystart...');
                    let pdata = await socket.proxyClient.start();
                    console.log('trystart...2');
                    cb(null, pdata);
                } catch (e) {
                    cb('Proxy connection failed', null);
                }
            });

            socket.on('imgArea', (data) => {
                this.registry.get('config').setConfig('crop', 'values', data);
                this.io.emit('imgArea', data);
                console.log(data);
            });

            socket.on('getProjects', async (page, perPage, cb) => {
                console.log('projects', page, perPage);
                let r = this.registry.get('redis');
                let projects = await r.lrange('projects', page * perPage, page * perPage + perPage);
                let result = [];
                for (let n in projects) {
                    console.log('project:' + projects[n]);
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
                this.registry.get('rotor')._config.invert = data;
                this.registry.get('config').setConfig('rotor', 'reverse', data);
            });

            socket.on('rotorCalibrateSetHome', () => {
                this.registry.get('rotor').setHome();
            });

            socket.on('turntableCalibrateSetHome', () => {
                this.registry.get('turntable').setHome();
            });

            socket.on('light-slide', (value) => {
                this.registry.get('config').setConfig('light', 'value', value);
                let l1 = (value == 1 || value == 2);
                let l2 = (value == 2);
                console.log(l1, l2);
                this.registry.get('gpio').light1.write(l1);
                this.registry.get('gpio').light2.write(l2);
            });

            socket.on('slider-change', (name, value) => {
                this.io.emit('slider-change', name, value);
                if (typeof this.change[name] != 'undefined') {
                    this.change[name](value);
                }
            });
            socket.on('slider-slide', (name, value) => {
                this.io.emit('slider-change', name, value);
                if (typeof this.slide[name] != 'undefined') {
                    this.slide[name](value);
                }
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