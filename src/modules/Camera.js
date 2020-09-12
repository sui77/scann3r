const PiCamera = require('pi-camera');
const fs = require('fs');
const {exec} = require("child_process");


class Camera {


    onSnapStart() {
    }

    onSnapDone(img) {
    }

    constructor(registry) {
        this.registry = registry;
        let config = registry.get('config');

        this.settingsDefaults = {
            mode: 'photo',
            output: '-',
            width: 640,
            height: 480,
            nopreview: true,
            timeout: 100,
        }

        this.settings = {}

        this.settingsPreview = {}

        this.cam = null;
        this.camPreview = null;

        this.refresh = false;

        this.settingsDefaults.shutter = config.getConfig('cameraShutter', 'value');
        this.settingsDefaults.brightness = config.getConfig('cameraBrightness', 'value');
        this.settingsDefaults.contrast = config.getConfig('cameraContrast', 'value');
        this.settingsDefaults.saturation = config.getConfig('cameraSaturation', 'value');
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
        try {
            let image = await this.camPreview.snap();
            let buff = Buffer.from(image, 'binary');
            let base64data = buff.toString('base64');
            this.onSnapDone('data:image/jpg;base64,' + base64data);
        } catch (e) {
            console.log('Could not snap preview', e);
        }
        if (this.refresh) {
            this.snapPreview();
        }
    }

    async snap(filename) {
        try {
            this.settings.output = filename;
            this.initCam();
            await this.cam.snap();
        } catch (e) {
            console.log('Could not snap image', e);
        }
    }

    startPreview() {
        if (!this.refresh) {
            this.snapPreview();
        }
        this.refresh = true;
    }

    stopPreview() {
        this.refresh = false;
    }

}

module.exports = Camera;