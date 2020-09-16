const fs = require('fs');
const {exec} = require('child_process');

class Scan {

    constructor(registry, sio) {

        this.registry = registry;
        this.io = sio;
        let config = this.registry.get('config');
        this.config = config;
        let rotorAngleRangeToScan = config.get('rotorAngleRangeToScan.values');

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

        this.init();
    }

    emitInfo(name, text) {
        this.io.emit('info', name, text);
    }

    async init() {
        let r = this.registry.get('redis');
        this.projectNo = await r.incrby('projectNo', 1);
        this.emitInfo('currentAction', `Starting project #${this.projectNo}.`);

        await r.lpush('projects', this.projectNo);
        await r.hset(`project:${this.projectNo}`, 'id', this.projectNo);

        this.folder = this.config.get('misc.projectsFolder') + '/' + this.projectNo
        fs.mkdirSync(this.folder);
        fs.mkdirSync(this.folder + '/original');
        fs.mkdirSync(this.folder + '/cropped');
    }

    async start() {
        this.io.emit('disableControls');

        this.emitInfo('currentAction', `Moving rotor and turntable to start position.`);
        await this.registry.get('rotor').turnTo(this.rotorStart);
        await this.registry.get('turntable').turnTo(0);
        await this.registry.get('camera').stopPreview();

        let complete = await this.next();
        if (complete) {
            await this.thumbnail();
            this.registry.get('camera').startPreview();
            await this.thumbnail();
            await this.zip();
        }

        await this.deleteImages('cropped', !complete);
        await this.deleteImages('original', !complete);

        this.io.emit('enableControls');
        this.emitInfo('currentImage', '');

        if (complete) {
            this.emitInfo('currentAction', `Finished scanning project #${this.projectNo}.`);
            let project = await this.registry.get('redis').hgetall('project:' + this.projectNo);
            this.io.emit('newProject', project);
        } else {
            this.emitInfo('currentAction', `Aborted project #${this.projectNo}.`);
        }

    }


    checkAbort() {
        if (this.registry.get('abort')) {
            this.registry.set('abort', false);
            this.emitInfo('curremtImage', '');
            this.emitInfo('currentText', 'Scan aborted.');
            return true;
        }
        return false;
    }

    async next() {
        if (this.checkAbort()) { return false; }

        let filename = `${this.rotorCurrent}-${this.turntableCurrent}.jpg`;
        let currentPicture = (this.rotorCurrent * (this.turntableCount + 1) + (this.turntableCurrent + 1)) + '/' + ((this.turntableCount + 1) * (this.rotorCount + 1));
        this.emitInfo('currentImage', `Picture ${currentPicture}`);
        this.emitInfo('currentAction', `Taking picture.`);
        await this.registry.get('camera').snapPreview();
        await this.registry.get('camera').snapProd(this.folder + '/original/' + filename);
        if (this.checkAbort()) { return false; }
        await this.crop(filename);

        this.turntableCurrent++;
        if (this.turntableCurrent > this.turntableCount) {  // one turntable revision complete
            this.rotorCurrent++;
            this.turntableCurrent = 0;
            if (this.rotorCurrent > this.rotorCount) {  // last rotor position complete = done
                return true;
            }
            this.emitInfo('currentAction', 'Moving turntable to home.');
            await this.registry.get('turntable').turnTo(this.turntableRangeMax);
            this.registry.get('turntable').setHome();
            
            let steps = this.rotorStart + this.rotorCurrent * this.rotorSteps;
            this.emitInfo('currentAction', `Moving rotor to ${steps} steps.`);
            await this.registry.get('rotor').turnTo(steps);
        }

        let steps = this.turntableCurrent * this.turntableSteps;
        this.emitInfo('currentAction', `Moving turntable to ${steps} steps.`);
        await this.registry.get('turntable').turnTo(steps);
        return this.next();
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

    async zip() {
        this.emitInfo('currentAction', `Creating ZIP file.`);
        let cmd = `/usr/bin/zip -j ${this.folder}/images.zip ${this.folder}/cropped/*.jpg`;
        return this._exec(cmd);
    }

    async crop(filename) {
        this.emitInfo('currentAction', `Cropping picture.`);
        let fW = this.config.get('camera.resolutionProd.width')/100;
        let fH = this.config.get('camera.resolutionProd.height')/100;
        let x = Math.round(this.cropValues.x*fW);
        let y = Math.round(this.cropValues.y*fH);
        let w = Math.round(this.cropValues.width*fW);
        let h = Math.round(this.cropValues.height*fH);
        let cmd = `convert -crop ${w}x${h}+${x}+${y} ${this.folder}/original/${filename} ${this.folder}/cropped/${filename}`;
        console.log(cmd);
        return this._exec(cmd);
    }

    async thumbnail() {
        this.emitInfo('currentAction', `Creating thumbnail.`);
        let middlePosition = Math.floor(this.rotorCount / 2);
        let cmd = `convert -define jpeg:size=180x180 ${this.folder}/cropped/0-${middlePosition}.jpg -thumbnail 180x180^ -gravity center -extent 180x180 jpeg:-`;
        let thumb = await this._exec(cmd, {encoding: 'binary', maxBuffer: 10 * 1024 * 1024});
        let buff = Buffer.from(thumb, 'binary');
        let base64data = buff.toString('base64');
        await this.registry.get('redis').hset(`project:${this.projectNo}`, 'thumb', 'data:image/jpg;base64,' + base64data);
    }

    async deleteImages(type, force) {
        if (force || this.config.get('misc.deleteImages.' + type)) {
            this.emitInfo('currentAction', `Deleting ${type} pictures.`);
            let cmd = `rm -rf ${this.folder}/${type}`;
            return this._exec(cmd);
        }
    }

}

module.exports = Scan;