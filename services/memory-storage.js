const config = require('../environment/environment.json');

class MemoryStorage {
    constructor() {
        this.data = new Map();
    }

    set(key, value) {
        this.data.set(key, value);
        return true;
    }

    get(key) {
        return this.data.get(key);
    }

    has(key) {
        return this.data.has(key);
    }

    delete(key) {
        return this.data.delete(key);
    }

    clear() {
        this.data.clear();
    }

    getAll() {
        return Object.fromEntries(this.data);
    }
}

module.exports = new MemoryStorage();