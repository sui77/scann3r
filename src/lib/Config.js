const _ = require('lodash');
const fs = require('fs');

class Config {

    constructor(configfile, registry) {
        this.data = require(configfile);
        this.registry = registry;
    }

    async loadValues() {
        let r = this.registry.get('redis');
        let data = await r.hgetall('values');

        for (let n in data) {
            let key = n.split('.');
            console.log(key);
            if (_.has(this.data, key[0]) && _.has(this.data[key[0]], key[1])) {
                this.data[key[0]][key[1]] = JSON.parse(data[n]);
            }
        }
        let file = JSON.parse(fs.readFileSync('./package.json').toString());
        this.data.version = file.version;
        console.log(file);
    }

    getConfig(key, subkey) {
        return _.get(this.data, key + '.' + subkey, null);
        return this.data[key][subkey];
    }

    setConfig(key, subkey, value) {
        let r = this.registry.get('redis');
        r.hset('values', key + '.' + subkey, JSON.stringify(value));
        this.data[key][subkey] = value;
    }

}
module.exports=Config;