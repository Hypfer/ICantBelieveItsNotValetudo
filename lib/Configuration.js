const fs = require("fs");
const Tools = require("./Tools");
const path = require("path");
const Jimp = require("jimp");

/**
 * @constructor
 */
const Configuration = function() {
    this.location = path.join(__dirname, "../config.json");
    this.settings = {
        mapSettings: {
            drawPath: true,
            drawCharger: true,
            drawRobot: true,
            scale: 4,
            rotate: 0,
            colors: {
                floor: "#0076ff",
                obstacle_weak: "#6699ff",
                obstacle_strong: "#52aeff",
                path: "#ffffff"
              }
        },
        mqtt : {
            identifier: "rockrobo",
            topicPrefix: "valetudo",
            autoconfPrefix: "homeassistant",
            broker_url: "mqtt://user:pass@foobar.example",
            caPath: "",
            mapDataTopic: "valetudo/rockrobo/map_data",
            minMillisecondsBetweenMapUpdates: 10000,
            publishMapImage: true
        },
        webserver: {
            enabled: false,
            port: 3000
        }
    };

    /* load an existing configuration file. if it is not present, create it using the default configuration */
    if(fs.existsSync(this.location)) {
        console.log("Loading configuration file:", this.location);

        try {
            this.settings = Object.assign(this.settings, JSON.parse(fs.readFileSync(this.location)));

            if (this.settings.mapSettings.scale > 5) {
                console.warn("Scale factor is too big!")
                this.settings.mapSettings.scale = 5;
            }

        } catch(e) {
            console.error("Invalid configuration file!");
            console.error(e);
            process.exit(1);
        }
        
        if (this.settings.mqtt.mapSettings) {
            // If an old (v0.2.0 and below) configuration structure is found, i.e. mapSettings is not a top-level
            // object but a child of mqtt, display a warning.
            console.warn("WARNING: You are using an old configuration file structure!");
            console.warn("WARNING: mapSettings must be moved to the top level.");
            console.warn("WARNING: Your current map settings are ignored.");
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
