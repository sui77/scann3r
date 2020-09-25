const PiCamera = require('pi-camera');
const fs = require('fs');
const {exec} = require("child_process");
const log = require('../lib/Log.js').createLogger({name: 'Camera'});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

var snapCount = 0;

class Camera {

    onPreviewDone(img) {
    }

    constructor(registry) {
        this.registry = registry;
        let config = this.config = registry.get('config');
        this.snapping = false;
        this.refresh = false;

        this.settingsProd = {
            mode: 'photo',
            output: '/dev/null',
            nopreview: true,
            timeout: 100,
            shutter: config.get('shutter.value'),
            brightness: config.get('brightness.value'),
            contrast: config.get('contrast.value'),
            saturation: config.get('saturation.value'),
            width: config.get('camera.resolutionProd.width'),
            height: config.get('camera.resolutionProd.height'),
        };

        this.settingsPreview = {
            mode: 'photo',
            output: '-',
            nopreview: true,
            timeout: 1,
            shutter: config.get('shutter.value'),
            brightness: config.get('brightness.value'),
            contrast: config.get('contrast.value'),
            saturation: config.get('saturation.value'),
            width: config.get('camera.resolutionPreview.width'),
            height: config.get('camera.resolutionPreview.height'),
        };

        this.camProd = null;
        this.camPreview = null;

        this.initCam();
    }

    set(key, value) {
        this.config.set(`${key}.value`, value);
        this.settingsProd[key] = this.settingsPreview[key] = value;
        this.initCam();
    }

    initCam() {
        this.camProd = new PiCamera(JSON.parse(JSON.stringify(this.settingsProd)));
        this.camPreview = new PiCamera(JSON.parse(JSON.stringify(this.settingsPreview)));
    }

    async snapPreview() {
        if (this.snapping) {
            return;
        }
        this.snapping = true;
        try {
            let image = await this.camPreview.snapDataUrl();
            this.onPreviewDone(image);
        } catch (e) {
            console.log('Could not snap preview', e);
        }
        this.snapping = false;
        if (this.refresh) {
            this.snapPreview();
        }

    }

    async snapProd(filename) {
        if (this.snapping) {
            await this.waitReady('a');
        }
        this.snapping = true;
        try {
            this.settingsProd.output = filename;
            this.initCam();
            await this.camProd.snap();
        } catch (e) {
            console.log('Could not snap image', e);
        }
        this.snapping = false;
    }

    async startPreview() {
        if (this.registry.get('scanning')) {
            return;
        }
        if (!this.refresh && !this.snapping) {
            if (await this.waitReady('b')) {
                log.info("Starting preview.");
                this.refresh = true;
                this.snapPreview();
            }
        }

    }

    async stopPreview() {
        log.info("Stop preview.");
        this.refresh = false;
        await this.waitReady('c');
    }

    async waitReady(from) {
        for (let n = 0; n < 50; n++) {
            if (!this.snapping) {
                return true;
            }
            await sleep(100);
        }
        return false;
    }

}

module.exports = Camera;