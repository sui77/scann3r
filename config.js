const path = require('path');

const config = {
    webserver: {
        port: 80
    },
    proxy: {
        url: 'ws://mc.sui.li:807',
    },
    projectsFolder: path.join(__dirname, '/projects'),
    camera: {
        resolutionPreview: {
            width: 640,
            height: 480,
        },
        resolution: {
            width: 3280,
            height: 2464,
        },
    },
    light: {
        pins: [17, 27],
        range: {min: 0, max: 255},
        displayRange: {min: 0, max: 100},
        displaySuffix: '%',
        value: 0,
    },
    turntable: {
        step: 11,
        dir: 9,
        enable: 3,
        range: {min: 0, max: 3200},
        displayRange: {min: 0, max: 360},
        displayDecimals: 1,
        displaySuffix: '°',
        value: 0,
    },
    rotor: {
        step: 6,
        dir: 5,
        enable: 3,
        range: {min: 0, max: 14000},
        displayRange: {min: 0, max: 120},
        displayDecimals: 1,
        displaySuffix: '°',
        value: 90,
        invert: false,
    },
    imagesPerRevision: {
        range: {min: 1, max: 360},
        displayRange: {min: 1, max: 360},
        displaySuffix: '',
        value: 36,
    },
    rotorAnglesPerScan: {
        range: {min: 1, max: 120},
        displayRange: {min: 1, max: 120},
        displaySuffix: '',
        value: 10,
    },
    rotorAngleRangeToScan: {
        range: {min: 0, max: 14000},
        displayRange: {min: 0, max: 120},
        displaySuffix: '°',
        values: [30, 120],
    },
    cameraShutter: {
        range: {min: 0.1*1000, max: 35*1000},
        displayRange: {min: 0.1, max: 35},
        displaySuffix: 'ms',
        value: 20,
        displayDecimals: 1
    },
    cameraContrast: {
        range: {min: -100, max: 100},
        displayRange: {min: -100, max: 100},
        displaySuffix: '',
        value: 0,
    },
    cameraBrightness: {
        range: {min: 0, max: 100},
        displayRange: {min: 0, max: 100},
        displaySuffix: '',
        value: 50,
    },
    cameraSaturation: {
        range: {min: -100, max: 100},
        displayRange: {min: -100, max: 100},
        displaySuffix: '',
        value: 0,
    },
    redis: {
        host: '127.0.0.1',
        port: 6379,
        db: 5
    },
}

module.exports = config;