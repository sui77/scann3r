const path = require('path');

const config = {
    webserver: {
        port: 8085
    },
    proxy: {
        url: 'ws://mc.sui.li:807',
        enabled: false,
    },
    misc: {
        projectsFolder: path.join(__dirname, '/projects'),
        deleteImages: {
            original: true,
            cropped: true
        },
        sleepBeforeTakingPicture: 500,
    },
    camera: {
        resolutionPreview: {
            width: 640,
            height: 480,
        },
        resolutionProd: {
            width: 3280,
            height: 2464,
        },
    },
    light: {
        pins: [17, 27],
        range: {min: 0, max: 2},
        displayRange: {min: 0, max: 100},
        steps: 1,
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
        values: [30, 1200],
    },
    shutter: {
        range: {min: 0.1*1000, max: 300*1000},
        displayRange: {min: 0.1, max: 300},
        displaySuffix: 'ms',
        value: 20,
        displayDecimals: 1
    },
    contrast: {
        range: {min: -100, max: 100},
        displayRange: {min: -100, max: 100},
        displaySuffix: '',
        value: 0,
    },
    brightness: {
        range: {min: 0, max: 100},
        displayRange: {min: 0, max: 100},
        displaySuffix: '',
        value: 50,
    },
    saturation: {
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
    crop: {
        values: {x: 10, y: 10, width: 80, height: 80}
    }
}

module.exports = config;