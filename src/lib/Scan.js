const {exec} = require('child_process');
const Project = require('./Project.js');

class Scan {

    onProgress(data) {

    }

    progress(data) {
        for (let n in data) {
            this.currentProgress[n] = data[n];
        }
        this.onProgress(this.currentProgress);
    }

    constructor(registry) {
        this.registry = registry;
        let config = this.registry.get('config');
        this.config = config;
        this.currentProgress = {
            photo: '-',
            text: '',
            percent: 0
        }

        let rotorAngleFrom = config.get('rotorAngleRangeToScan.values')[0];
        let rotorAngleTo = config.get('rotorAngleRangeToScan.values')[1];
        let rotorAnglesPerScan = config.get('rotorAnglesPerScan.value');
        let imagesPerRevision = config.get('imagesPerRevision.value');

        this.turntableRangeMax = config.get('turntable.range.max');

        this.rotorStart = rotorAngleFrom;
        this.rotorSteps = Math.floor((rotorAngleTo - rotorAngleFrom) / rotorAnglesPerScan);
        this.turntableSteps = Math.floor(this.turntableRangeMax / imagesPerRevision);

        this.rotorCurrent = 0;
        this.turntableCurrent = 0;
        this.rotorCount = rotorAnglesPerScan - 1;
        this.turntableCount = imagesPerRevision - 1;

        this.cropValues = config.get('crop.values');
    }


    async start() {
        this.project = await Project.create(this.registry);
        this.progress({text: `Starting project #${this.project.id}.`});

        this.progress({text: `Moving rotor and turntable to start position.`});
        await this.registry.get('rotor').turnTo(this.rotorStart);
        await this.registry.get('turntable').turnTo(0);
        await this.registry.get('camera').stopPreview();

        let complete = await this.next();
        if (complete) {
            this.registry.get('camera').startPreview();
            await this.thumbnail();
            await this.zip();
            await this.deleteImages('cropped');
            await this.deleteImages('original');
            this.progress({photo: '', text: `Finished scanning project #${this.project.id}.`});
        } else {
            this.progress({photo: '', text: `Scan failed #${this.project.id}.`});
        }

        return this.project;
    }

    checkAbort() {
        if (this.registry.get('abort')) {
            this.registry.set('abort', false);
            this.progress({photo: '', text: 'Scan aborted.'});
            return true;
        }
        return false;
    }

    async next() {
        if (this.checkAbort()) {
            return false;
        }

        let filename = `${this.rotorCurrent}-${this.turntableCurrent}.jpg`;
        let currentImage = (this.rotorCurrent * (this.turntableCount + 1) + (this.turntableCurrent + 1)) + '/' + ((this.turntableCount + 1) * (this.rotorCount + 1));
        this.progress({photo: `Photo ${currentImage}`, text: `Taking photo.`});
        await this.registry.get('camera').snapPreview();
        await this.registry.get('camera').snapProd(this.project.getPath('original') + filename);
        if (this.checkAbort()) {
            return false;
        }
        await this.crop(filename);

        this.turntableCurrent++;
        if (this.turntableCurrent > this.turntableCount) {  // one turntable revision complete
            this.rotorCurrent++;
            this.turntableCurrent = 0;
            if (this.rotorCurrent > this.rotorCount) {  // last rotor position complete = done
                return true;
            }
            this.progress({text: 'Moving turntable to home.'});
            await this.registry.get('turntable').turnTo(this.turntableRangeMax);
            this.registry.get('turntable').setHome();

            let steps = this.rotorStart + this.rotorCurrent * this.rotorSteps;
            this.progress({text: `Moving rotor to ${steps} steps.`});
            await this.registry.get('rotor').turnTo(steps);
        }

        let steps = this.turntableCurrent * this.turntableSteps;
        this.progress({text: `Moving turntable to ${steps} steps.`});
        await this.registry.get('turntable').turnTo(steps);
        return this.next();
    }

    async zip() {
        this.progress({text: `Creating ZIP file.`});
        let filesToZip = this.project.getPath('cropped') + '*.jpg';
        let zipFile = this.project.getPath() + 'images-' + this.project.id + '.zip';
        let cmd = `/usr/bin/zip -j ${zipFile} ${filesToZip}`;
        return this._exec(cmd);
    }

    async crop(filename) {
        this.progress({text: `Cropping photo.`});
        let fW = this.config.get('camera.resolutionProd.width') / 100;
        let fH = this.config.get('camera.resolutionProd.height') / 100;
        let x = Math.round(this.cropValues.x * fW);
        let y = Math.round(this.cropValues.y * fH);
        let w = Math.round(this.cropValues.width * fW);
        let h = Math.round(this.cropValues.height * fH);
        let originalFile = this.project.getPath('original') + filename;
        let croppedFile = this.project.getPath('cropped') + filename;
        let cmd = `convert -crop ${w}x${h}+${x}+${y} ${originalFile} ${croppedFile}`;
        return this._exec(cmd);
    }

    async thumbnail() {
        this.progress({text: `Creating thumbnail.`});
        let filename = '0-' + Math.floor(this.rotorCount / 2) + '.jpg';
        let imageFile = this.project.getPath('cropped') + filename;
        let cmd = `convert -define jpeg:size=180x180 ${imageFile} -thumbnail 180x180^ -gravity center -extent 180x180 jpeg:-`;
        let thumb = await this._exec(cmd, {encoding: 'binary', maxBuffer: 10 * 1024 * 1024});
        let buff = Buffer.from(thumb, 'binary');
        let base64data = 'data:image/jpg;base64,' + buff.toString('base64');
        this.project.set('thumb', base64data);
    }

    async deleteImages(type) {
        if (this.config.get('misc.deleteImages.' + type)) {
            this.progress({text: `Deleting ${type} photos.`});
            let directory = this.project.getPath(type);
            let cmd = `rm -rf ${directory}`;
            return this._exec(cmd);
        }
    }

    async _exec(cmd, options = {}) {
        return new Promise((resolve, reject) => {
            exec(cmd, options, (error, stdout, stderr) => {
                if (stderr || error) {
                    reject(stderr || error);
                }
                resolve(stdout);
            });
        });
    }

}

module.exports = Scan;