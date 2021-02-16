const fs = require("fs");
const path = require("path");

/**
 * @constructor
 */
const Configuration = function () {
    this.location = path.join(__dirname, "../config.json");
    this.settings = {
        mapSettings: {
            drawPath: true,
            drawCharger: true,
            drawRobot: true,
            scale: 2,
            rotate: 0,
            colors: {
                floor: "#0076ff",
                obstacle: "#52aeff",
                path: "#ffffff"
            }
        },
        mqtt: {
            identifier: "rockrobo",
            topicPrefix: "valetudo",
            autoconfPrefix: "homeassistant",
            broker_url: "mqtt://user:pass@foobar.example",
            caPath: "",
            mapDataTopic: "valetudo/rockrobo/map_data",
            minMillisecondsBetweenMapUpdates: 10000,
            publishMapImage: true
        }
    };

    /* load an existing configuration file. if it is not present, create it using the default configuration */
    if (fs.existsSync(this.location)) {
        console.log("Loading configuration file:", this.location);

        try {
            this.settings = Object.assign(this.settings, JSON.parse(fs.readFileSync(this.location)));
        } catch (e) {
            console.error("Invalid configuration file!");
            console.error(e);
            process.exit(1);
        }
    } else {
        console.log("No configuration file present. Creating one at:", this.location);
        const dirname = path.dirname(this.location);
        if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname);
        }
        this.persist();
    }
};


/**
 *
 * @param key {string}
 * @returns {*}
 */
Configuration.prototype.get = function (key) {
    return this.settings[key];
};

Configuration.prototype.getAll = function () {
    return this.settings;
};

/**
 *
 * @param key {string}
 * @param val {string}
 */
Configuration.prototype.set = function (key, val) {
    this.settings[key] = val;

    this.persist();
};

Configuration.prototype.persist = function () {
    fs.writeFileSync(this.location, JSON.stringify(this.settings, null, 2));
};

module.exports = Configuration;
