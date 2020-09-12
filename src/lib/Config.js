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
            if (typeof this.data[key[0]][key[1]] != 'undefined') {
                this.data[key[0]][key[1]] = JSON.parse(data[n]);
            }
        }
    }

    getConfig(key, subkey) {
        return this.data[key][subkey];
    }

    setConfig(key, subkey, value) {
        let r = this.registry.get('redis');
        r.hset('values', key + '.' + subkey, JSON.stringify(value));
        this.data[key][subkey] = value;
    }

}
module.exports=Config;