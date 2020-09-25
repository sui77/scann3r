const _ = require('lodash');
const fs = require('fs');
const log = require('../lib/Log.js').createLogger({name: 'Config'});

class Config {

    constructor(configfile, registry) {
        this.data = require(configfile);
        this.registry = registry;
        this.redis = null;
    }

    async loadDynamicValues() {
        this.redis = this.registry.get('redis');
        let data = await this.redis.hgetall('values');
        for (let n in data) {
            if (_.has(this.data, n)) {
                _.set(this.data, n, JSON.parse(data[n]));
            }
        }

        let file = JSON.parse(fs.readFileSync('./package.json').toString());
        this.data.version = file.version;
    }

    get(key, defaultVal = null) {
        return _.get(this.data, key, defaultVal);
    }

    set(key, value) {
        this.redis.hset('values', key, JSON.stringify(value));
         _.set(this.data, key, value);
    }

}
module.exports=Config;