const fs = require("fs");
const path = require("path");
const {EventEmitter} = require("events");

const DEFAULT_SETTINGS = require("./res/default_config.json");
const Logger = require("./Logger");

class Configuration {

    constructor() {
        /** @private */
        this.eventEmitter = new EventEmitter();
        this.settings = [DEFAULT_SETTINGS];

        this.location = path.join(__dirname, "../config.json");

        /* load an existing configuration file. if it is not present, create it using the default configuration */
        if (fs.existsSync(this.location)) {
            Logger.info("Loading configuration file:", this.location);

            try {
                const configFileContent = JSON.parse(fs.readFileSync(this.location, {"encoding": "utf-8"}).toString());
                const configArray = Array.isArray(configFileContent) ? configFileContent : [configFileContent];

                this.settings = configArray.map(configEntry => Object.assign(
                    {},
                    DEFAULT_SETTINGS,
                    configEntry
                ));

                if (this.getSerializedConfig() !== JSON.stringify(configArray, null, 2)) {
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

    getConfigCount() {
        return this.settings.length;
    }

    /**
     * @param {number} configIdx
     * @param {string} key
     * @returns {*}
     */
    get(configIdx, key) {
        this.assertConfigIndex(configIdx);
        return this.settings[configIdx][key];
    }

    getAll(configIdx) {
        this.assertConfigIndex(configIdx);
        return this.settings[configIdx];
    }

    /**
     * @param {number} configIdx
     * @param {string} key
     * @param {string|object} val
     */
    set(configIdx, key, val) { //TODO: set nested
        this.assertConfigIndex(configIdx);
        this.settings[configIdx][key] = val;

        this.persist();
    }

    persist() {
        fs.writeFileSync(this.location, this.getSerializedConfig());
    }

    /**
     * @param {number} configIdx
     * @private
     */
    assertConfigIndex(configIdx) {
        if (configIdx < 0 || configIdx > this.settings.length) {
            throw new Error("Config index is out of bounds");
        }
    }

    /**
     * @private
     */
    getSerializedConfig() {
        if (this.getConfigCount() === 1) {
            return JSON.stringify(this.settings[0], null, 2);
        } else {
            return JSON.stringify(this.settings, null, 2);
        }
    }
}

module.exports = Configuration;
