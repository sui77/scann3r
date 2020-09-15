const PiCamera = require('pi-camera');
const fs = require('fs');
const {exec} = require("child_process");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var snapCount = 0;

class Camera {


    onSnapStart() {
    }

    onSnapDone(img) {
    }

    constructor(registry) {
        this.registry = registry;
        let config = registry.get('config');
        this.snapping = false;

        this.settingsDefaults = {
            mode: 'photo',
            output: '-',
            width: 640,
            height: 480,
            nopreview: true,
            timeout: 100
        }

        this.settings = {}

        this.settingsPreview = {}

        this.cam = null;
        this.camPreview = null;

        this.refresh = false;

        this.settingsDefaults.shutter = config.getConfig('shutter', 'value');
        this.settingsDefaults.brightness = config.getConfig('brightness', 'value');
        this.settingsDefaults.contrast = config.getConfig('contrast', 'value');
        this.settingsDefaults.saturation = config.getConfig('saturation', 'value');
        for (let n in this.settingsDefaults) {
            this.settings[n] = this.settingsDefaults[n];
            this.settingsPreview[n] = this.settingsDefaults[n];
        }
        let resoultion = config.getConfig('camera', 'resolution');
        this.settings.width = resoultion.width;
        this.settings.height = resoultion.height;

        resoultion = config.getConfig('camera', 'resolutionPreview');
        this.settingsPreview.width = resoultion.width;
        this.settingsPreview.height = resoultion.height;

        this.initCam();
    }

    setSetting(key, value) {
        console.log("Set " + key + " " + value);
        if (value == null) {
            unset(this.settings[key]);
        } else {
            this.settings[key] = value;
            this.settingsPreview[key] = value;
        }
        this.initCam();
    }

    setPreview() {
        this.settings.width = 640;
        this.settings.height = 480;
        this.initCam();
    }

    setHires() {
        this.settings.width = 3280;
        this.settings.height = 2464;
        this.initCam();
    }

    initCam() {
        this.cam = new PiCamera(JSON.parse(JSON.stringify(this.settings)));
        this.camPreview = new PiCamera(JSON.parse(JSON.stringify(this.settingsPreview)));
    }

    async snapPreview() {
        if (this.snapping) {
            return;
        }
        this.snapping = true;
        try {
            let image = await this.camPreview.snapDataUrl();
            this.onSnapDone(image);
        } catch (e) {
            console.log('Could not snap preview', e);
            process.exit();
        }
        this.snapping = false;
        if (this.refresh) {
            this.snapPreview();
        }

    }

    async snap(filename) {
        if (this.snapping) {
            await this.waitReady();
        }
        this.snapping = true;
        try {
            this.settings.output = filename;
            this.initCam();
            await this.cam.snap();
            await this.crop(filename);
        } catch (e) {
            console.log('Could not snap image', e);
        }
        this.snapping = false;
    }

    async crop(filename) {
        let cfg = this.registry.get('config').getConfig('crop', 'values');

        let fW = 3280/100;
        let fH = 2464/100;
        let x = Math.round(cfg.x*fW);
        let y = Math.round(cfg.y*fH);
        let w = Math.round(cfg.width*fW);
        let h = Math.round(cfg.height*fH);
        let fullCmd = `mogrify -crop ${w}x${h}+${x}+${y} ${filename}`;
        let xx = () => { return new Promise((resolve, reject) => {
            exec(fullCmd, (error, stdout, stderr) => {
                if (stderr || error) {
                    reject(stderr || error);
                }
                resolve(stdout);
            });
        })};
        let res = await xx();
        console.log(res);
    }

    startPreview() {
        if (!this.refresh && !this.snapping) {
            console.log('MSS============');
            this.snapPreview();
        }
        this.refresh = true;
    }

    async waitReady() {
        for (let n = 0; n < 20; n++) {
            if (!this.snapping) {
                return;
            }
            await sleep(100);
        }
    }

    async stopPreview() {
        this.refresh = false;
        await this.waitReady();
    }

}

module.exports = Camera;