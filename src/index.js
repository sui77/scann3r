const WebServer = require('./modules/WebServer.js');
const WebSocket = require('./modules/WebSocket.js');
const Stepper = require('./modules/Stepper.js');
const Camera = require('./modules/Camera.js');
const Proxy = require('./modules/Proxy.js');
const Registry = require('./lib/Registry.js');
const Config = require('./lib/Config.js');
const Redis = require('async-redis');
const Gpio = require('onoff').Gpio;
const path = require('path');
const fs = require('fs');
const Notification = require('./lib/Notification');

var i2c = require('i2c-bus');
var MPU6050 = require('i2c-mpu6050');

const log = require('./lib/Log.js').createLogger({name: 'Main'});

let gpio = {};

let configfile = path.join(__dirname, '/../config.js');
if (!fs.existsSync(configfile)) {
    log.info('config.js not found, copying from config.dist.js');
    fs.copyFileSync(path.join(__dirname, '/../config.dist.js'), configfile);
}


(async () => {
    try {
        const registry = new Registry();
        const config = new Config('../../config.js', registry);

        gpio = {
            light1: new Gpio(config.data.light.pins[0], 'out'),
            light2: new Gpio(config.data.light.pins[1], 'out'),
            turntableStep: new Gpio(config.data.turntable.step, 'out'),
            turntableDir: new Gpio(config.data.turntable.dir, 'out'),
            turntableEnable: new Gpio(config.data.turntable.enable, 'out'),
            rotorStep: new Gpio(config.data.rotor.step, 'out'),
            rotorDir: new Gpio(config.data.rotor.dir, 'out'),
            rotorEnable: new Gpio(config.data.rotor.enable, 'out'),
        };


        registry.set('currentScan', null);
        registry.set('config', config);
        registry.set('redis', Redis.createClient(config.data.redis));
        await config.loadDynamicValues();
        registry.set('gpio', gpio);
        registry.set('turntable', new Stepper(config.data.turntable, gpio.turntableStep, gpio.turntableDir, gpio.turntableEnable));
        registry.set('rotor', new Stepper(config.data.rotor, gpio.rotorStep, gpio.rotorDir, gpio.rotorEnable));
        registry.set('camera', new Camera(registry));
        registry.set('proxy', new Proxy(registry));
        registry.set('webServer', new WebServer(registry));
        registry.set('webSocket', new WebSocket(registry));
        registry.set('notification', new Notification(registry));


        const i2c1 = i2c.openSync(3);
        const sensor = new MPU6050(i2c1, 0x68);
        const sensorValues = [];
        setInterval(() => {
            let data = sensor.readSync();
            sensorValues.push( data.rotation.x );
            if (sensorValues.length >=30) {
                sensorValues.shift();
            }
            let sum = 0;
            for (n = 0; n< sensorValues.length; n++) {
                sum+= sensorValues[n];
            }
            let avg = sum / sensorValues.length;
            data.rotation.x = avg;
            //console.log(sensorValues.length, sensorValues);
            registry.get('webSocket').gyro(data);
        }, 100);

        log.info('Ready!');
    } catch (e) {
        log.error('Error on startup: ' + e.message);
        console.log(e);
    }


})();


process.on('SIGINT', _ => {
    for (let n in gpio) {
        try {
            gpio[n].unexport();
        } catch (e) {
            console.log('Error unexporting gpio ' + n);
        }
    }
    process.exit();
});

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
    // application specific logging, throwing an error, or other logic here
});