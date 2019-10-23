const fs = require("fs");
const Tools = require("./Tools");
const path = require("path");

/**
 * @constructor
 */
const Configuration = function() {
    this.location = path.join(__dirname, "../config.json");
    this.settings = {
        "mqtt" : {
            identifier: "rockrobo",
            topicPrefix: "valetudo",
            autoconfPrefix: "homeassistant",
            broker_url: "mqtt://user:pass@foobar.example",
            caPath: "",
            mapSettings: {
                drawPath: true,
                drawCharger: true,
                drawRobot: true,
                drawForbiddenZones: true,
                drawVirtualWalls: true,
                border: 2,
                scale: 4
            },
            mapDataTopic: "valetudo/rockrobo/map_data",
            minMillisecondsBetweenMapUpdates: 10000,
            publishMapImage: true
        },
        "webserver": {
            enabled: false,
            port: 3000
        }
    };

    /* load an existing configuration file. if it is not present, create it using the default configuration */
    if(fs.existsSync(this.location)) {
        console.log("Loading configuration file:", this.location);

        try {
            this.settings = Object.assign(this.settings, JSON.parse(fs.readFileSync(this.location)));
            this.persist();
        } catch(e) {
            console.error("Invalid configuration file!");
            console.log("Writing new file using defaults");

            this.persist();
        }
    } else {
        console.log("No configuration file present. Creating one at:", this.location);
        Tools.MK_DIR_PATH(path.dirname(this.location));
        this.persist();
    }
};


/**
 *
 * @param key {string}
 * @returns {*}
 */
Configuration.prototype.get = function(key) {
    return this.settings[key];
};

Configuration.prototype.getAll = function() {
    return this.settings;
};

/**
 *
 * @param key {string}
 * @param val {string}
 */
Configuration.prototype.set = function(key, val) {
    this.settings[key] = val;

    this.persist();
};

Configuration.prototype.persist = function() {
    fs.writeFileSync(this.location, JSON.stringify(this.settings, null, 2));
};

module.exports = Configuration;
