class Registry {



    constructor() {
        this.registry = {}
    }

    set(key, value) {
        this.registry[key] = value;
    }

    get(key) {
        return this.registry[key];
    }
}
module.exports = Registry;