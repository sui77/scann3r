const NanoTimer = require('nanotimer');
const Gpio = require('pigpio').Gpio;

let enableTimeouts = {};
let timeoutInterval = null;

class Stepper {



    constructor(config) {



        this.onTurn = function(step) {};

        this._config = config;
        this._abort = false;
        this._delay = 10;
        console.log("STEPS", config.value);
        this._steps = config.value;
        this._targetSteps = 0;
        this._turning = false;

        this._step = new Gpio(config.step, { mode: Gpio.OUTPUT });
        this._dir = new Gpio(config.dir, { mode: Gpio.OUTPUT });;
        this._step.digitalWrite(false);
        this._dir.digitalWrite(false);

        if (config.enable) {
            if (typeof enableTimeouts['e' + this._config.enable] == 'undefined') {
                let gpio = new Gpio(this._config.enable, { mode: Gpio.OUTPUT });
                enableTimeouts['e' + this._config.enable] = {
                    status: false,
                    ts: Math.floor(+new Date() / 1000),
                    gpio: gpio
                }
                gpio.digitalWrite(true);
            }
            if (timeoutInterval == null) {
                setInterval(this.autoToggleDisable, 1000);
            }
        }

    }

    get delay() {
        return this._delay;
    }

    set delay(d) {
        if (typeof d != 'number') throw `'delay' must be a number (${d})`;
        if (d <= 0) throw `'delay' must be >= 0 (${d})`;
        this._delay = d;
    }

    get turning() {
        return this._turning;
    }

    autoToggleDisable() {
        let to = Stepper.enableTimeouts;
        let now = Math.floor(+new Date() / 1000);

        for (let n in to) {
            if (to[n].status == true && to[n].ts < now - 60) {
                to[n].gpio.digitalWrite(true);
                to[n].status = false;
            }
        }
    }

    autoToggleEnable() {
        let to = enableTimeouts['e' + this._config.enable];
        let now = Math.floor(+new Date() / 1000);
        if (to.status == false) {
            to.gpio.digitalWrite(false);
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
            this._dir.digitalWrite( this._config.reverse?false:true );
        } else if (this._steps < this._targetSteps) {
            this._steps++;
            this._dir.digitalWrite( this._config.reverse?true:false );
        } else {
            this._turning = false;
            this.onTurn(this._steps);
            res(this._steps);
            return;
        }

        if (this._steps % 150== 0) {
            this.onTurn(this._steps);
        }

        this._step.digitalWrite(true);
        this._step.digitalWrite(false);

         var timer = new NanoTimer();
         timer.setTimeout(() => this._turn( res), [timer], '500u');

//        setTimeout(() => this._turn( res), this._delay);
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
        console.log(steps);
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
