const fs = require('fs');
const {exec} = require('child_process');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Scan {

    constructor(registry) {

        this.registry = registry;
        let config = this.registry.get('config');
        this.config = config;
        let rotorAngleRangeToScan = config.getConfig('rotorAngleRangeToScan', 'values');
        let rotorAnglesPerScan = config.getConfig('rotorAnglesPerScan', 'value');
        let imagesPerRevision = config.getConfig('imagesPerRevision', 'value');
        let turntableRange = config.getConfig('turntable', 'range').max;

        this.turntableRange = turntableRange;

        this.rotorStart = rotorAngleRangeToScan[0];
        this.rotorSteps = Math.floor((rotorAngleRangeToScan[1] - rotorAngleRangeToScan[0]) / rotorAnglesPerScan);
        this.turntSteps = Math.floor(turntableRange / (imagesPerRevision + 1));
        this.rotorNum = rotorAnglesPerScan;
        this.turntNum = imagesPerRevision;
        this.rotorCurr = 0;
        this.turntCurr = 0;
    }

    async init() {

    }

    async start() {

        let r = this.registry.get('redis');
        let n = await r.incrby('projectNo', 1);
        this.projectNo = n;
        await r.lpush('projects', n);
        this.directory = this.config.data.projectsFolder + "/" + n
        fs.mkdirSync(this.directory);

        await this.registry.get('rotor').turnTo(this.rotorStart);
        await this.registry.get('turntable').turnTo(0);
        this.registry.get('camera').stopPreview();
        await this.next();
        this.registry.get('camera').startPreview();
        try {
            let thumb = await this.thumbnail();
            let buff = Buffer.from(thumb, 'binary');
            let base64data = buff.toString('base64');
            await r.hset('project:' + n, 'thumb', 'data:image/jpg;base64,' + base64data);
            await this.zip();
        } catch (e) {
            console.log("Could not zip", e);
        }

    }

    async thumbnail() {
            return new Promise((resolve, reject) => {
            let fullCmd = 'convert -define jpeg:size=180x180 ' + this.directory + '/0-0.jpg  -thumbnail 180x180^ -gravity center -extent 180x180 jpeg:-';
                console.log(fullCmd);
            exec(fullCmd, {encoding: 'binary', maxBuffer: 10 * 1024 * 1024}, (error, stdout, stderr) => {
                if (stderr || error) {
                    reject(stderr || error);
                }
                resolve(stdout);
            });
        });
    }

    async zip() {
        return new Promise((resolve, reject) => {
            let fullCmd = '/usr/bin/zip -j ' + this.directory + '/../' + this.projectNo + '.zip ' + this.directory + '/*.jpg && rm -rf ' + this.directory;
            console.log(fullCmd);


            exec(fullCmd, {encoding: 'binary', maxBuffer: 10 * 1024 * 1024}, (error, stdout, stderr) => {
                if (stderr || error) {
                    reject(stderr || error);
                }
                resolve(stdout);
            });
        });
    }

    async next() {
        console.log([this.rotorCurr, this.turntCurr]);
        await sleep(500);
        await this.registry.get('camera').snap(this.directory + '/' + this.rotorCurr + '-' + this.turntCurr + '.jpg');
        await this.registry.get('camera').snapPreview();

        if (this.turntCurr == this.turntNum - 1) {
            this.rotorCurr++;
            this.turntCurr = 0;
            await this.registry.get('turntable').turnTo(this.turntableRange);
            this.registry.get('turntable').setHome();
            if (this.rotorCurr > this.rotorNum) {
                return;
            }
            await this.registry.get('rotor').turnTo(this.rotorStart + this.rotorCurr * this.rotorSteps);
        }

        this.turntCurr++;
        await this.registry.get('turntable').turnTo(this.turntCurr * this.turntSteps);

        return this.next();
    }
}

module.exports = Scan;