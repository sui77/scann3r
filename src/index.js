const WebServer = require('./modules/WebServer.js');
const WebSocket = require('./modules/WebSocket.js');
const Stepper = require('./modules/Stepper.js');
const Camera = require('./modules/Camera.js');
const Registry = require('./lib/Registry.js');
const Config = require('./lib/Config.js');
const Redis = require('async-redis');
const Gpio = require('pigpio').Gpio;

const registry = new Registry();

(async () => {
    const config = new Config('../../config.js', registry);
    registry.set('config', config);
    registry.set('redis', Redis.createClient(config.data.redis));
    await config.loadValues();

    registry.set('turntable', new Stepper(config.data.turntable));
    registry.set('rotor', new Stepper(config.data.rotor));
    registry.set('camera', new Camera(registry));
    registry.set('webServer', new WebServer(registry));
    registry.set('webSocket', new WebSocket(registry));

})();


function shutdown() {
    Gpio.unexport();
    process.exit(0);
}
process.on('SIGHUP', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGCONT', shutdown);