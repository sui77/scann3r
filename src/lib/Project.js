const fs = require('fs');

class Project {

    constructor(id, registry) {
        this.id = id;
        this.redis = registry.get('redis');
        this.config = registry.get('config');
    }

    async getAll() {
        return this.redis.hgetall(`project:${this.id}`);
    }

    async get(key) {
        return this.redis.hget(`project:${this.id}`, key);
    }

    async set(key, value) {
        return this.redis.hset(`project:${this.id}`, key, value);
    }

    getPath(subFolder) {
        return this.config.get('misc.projectsFolder') + '/' + this.id + '/' + (subFolder ? subFolder + '/' : '');
    }

    getZipFileLocation() {
        return this.getPath() + '/images-' + this.id + '.zip';
    }

    createFolder() {
        fs.mkdirSync(this.getPath());
        fs.mkdirSync(this.getPath('original'));
        fs.mkdirSync(this.getPath('cropped'));
    }

    /**
     *
     * @param registry
     * @returns {Promise<Project>}
     */
    static async create(registry) {
        let r = registry.get('redis');
        let id = await r.incrby('projectId', 1);
        await r.lpush('projects', id);
        await r.hset(`project:${id}`, 'id', id);
        let p = new Project(id, registry);
        p.createFolder();
        return p;
    }
}
module.exports = Project;