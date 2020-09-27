const NanoTimer = require('nanotimer');

let enableTimeouts = {};
let timeoutInterval = null;

class Stepper {

    onTurn(step) {

    }

    constructor(config, step, dir, enable) {

        this._config = config;
        this._abort = false;
        this._steps = config.value;
        this._targetSteps = 0;
        this._turning = false;

        this._enablePin = enable._gpio;

        this._step = step;
        this._dir = dir;
        this._step.write(0);
        this._dir.write(0);

        if (enable !== null) {
            let pin = enable._gpio;
            if (typeof enableTimeouts['e' + this._enablePin] == 'undefined') {
                enableTimeouts['e' + this._enablePin] = {
                    status: false,
                    ts: Math.floor(new Date() / 1000),
                    gpio: enable
                }
                enable.write(1);
            }
            if (timeoutInterval == null) {
                setInterval(this.autoToggleDisable, 1000);
            }
        }
    }

    autoToggleDisable() {
        let to = enableTimeouts;
        let now = Math.floor(+new Date() / 1000);

        for (let n in to) {
            if (to[n].status == true && to[n].ts < now - 60) {
                to[n].gpio.write(1);
                to[n].status = false;
            }
        }
    }

    autoToggleEnable() {
        let to = enableTimeouts['e' + this._enablePin];
        let now = Math.floor(+new Date() / 1000);
        if (to.status == false) {
            to.gpio.write(0);
            to.status = true;
        }
        to.ts = Math.floor(+new Date() / 1000);
    }

    _turn(res) {
        if (this._abort) {
            this._turning = false;
            res(this._steps);
            return;
        }
        this.autoToggleEnable();

        if (this._steps > this._targetSteps) {
            this._steps--;
            this._dir.write(this._config.invert ? 0 : 1);
        } else if (this._steps < this._targetSteps) {
            this._steps++;
            this._dir.write(this._config.invert ? 1 : 0);
        } else {
            this._turning = false;
            this.onTurn(this._steps);
            res(this._steps);
            return;
        }

        if (this._steps % 250 == 0) {
            this.onTurn(this._steps);
        }

        this._step.write(1);
        var timer = new NanoTimer();
        timer.setTimeout(() => {
            this._step.write(0);
            timer.setTimeout(() => this._turn(res), [timer], '500u');
        }, [timer], '500u');
    }

    setHome() {
        this._steps = 0;
        this.onTurn(0);
    }

    turnTo(steps) {
        this._targetSteps = steps;
        return this.turn();
    }

    turnBy(steps) {
        this._targetSteps += steps;
        return this.turn();
    }

    turn() {
        if (this._turning) return Promise.reject(new Error('Motor already running'));
        this._abort = false;
        this._turning = true;
        return new Promise(res => this._turn(res));
    }

    stop() {
        this._abort = true;
    }

}

module.exports = Stepper;
