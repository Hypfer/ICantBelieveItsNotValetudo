const fs = require("fs");
const path = require("path");
const {EventEmitter} = require("events");

const DEFAULT_SETTINGS = require("./res/default_config.json");
const Logger = require("./Logger");

class Configuration {

    constructor() {
        /** @private */
        this.eventEmitter = new EventEmitter();
        this.settings = DEFAULT_SETTINGS;

        this.location = path.join(__dirname, "../config.json");

        /* load an existing configuration file. if it is not present, create it using the default configuration */
        if (fs.existsSync(this.location)) {
            Logger.info("Loading configuration file:", this.location);

            try {
                const config = JSON.parse(fs.readFileSync(this.location, {"encoding": "utf-8"}).toString());

                this.settings = Object.assign(
                    {},
                    this.settings,
                    config
                );

                if (this.getSerializedConfig() !== config) {
                    Logger.info(`Schema changes were applied to the configuration file at: ${this.location}`);

                    this.persist();
                }
            } catch (e) {
                Logger.error("Invalid configuration file!");
                Logger.info("Writing new file using defaults");

                try {
                    fs.renameSync(this.location, this.location + ".backup");
                    Logger.info("Backup moved to " + this.location + ".backup");
                } catch (e) {
                    Logger.info("Failed to move backup", e);
                }

                this.persist();
            }
        } else {
            Logger.info("No configuration file present. Creating one at:", this.location);
            fs.mkdirSync(path.dirname(this.location), {recursive: true });

            this.persist();
        }
    }

    /**
     * @param {string} key
     * @returns {*}
     */
    get(key) {
        return this.settings[key];
    }

    getAll() {
        return this.settings;
    }

    /**
     * @param {string} key
     * @param {string|object} val
     */
    set(key, val) { //TODO: set nested
        this.settings[key] = val;

        this.persist();
    }

    persist() {
        fs.writeFileSync(this.location, this.getSerializedConfig());
    }

    /**
     * @private
     */
    getSerializedConfig() {
        return JSON.stringify(this.settings, null, 2);
    }
}

module.exports = Configuration;
