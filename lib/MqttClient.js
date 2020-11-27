const fs = require("fs");
const mqtt = require("mqtt");

const MapDrawer = require("./MapDrawer");

/**
 *
 * @param options {object}
 * @param options.brokerURL {string}
 * @param options.caPath {string}
 * @param options.identifier {string}
 * @param options.topicPrefix {string}
 * @param options.autoconfPrefix {string}
 * @param options.mapSettings {object}
 * @param options.mapDataTopic {string}
 * @param options.minMillisecondsBetweenMapUpdates {number}
 * @param options.publishMapImage {boolean}
 * @param options.events {EventEmitter}
 * @constructor
 */
const MqttClient = function(options) {
    this.brokerURL = options.brokerURL;
    this.caPath = options.caPath || "";
    this.identifier = options.identifier || "rockrobo";
    this.topicPrefix = options.topicPrefix || "valetudo";
    this.autoconfPrefix = options.autoconfPrefix || "homeassistant";
    this.mapSettings = options.mapSettings || {};
    this.mapDataTopic = options.mapDataTopic || "valetudo/rockrobo/map_data";
    this.minMillisecondsBetweenMapUpdates = options.minMillisecondsBetweenMapUpdates || 10000;
    this.publishMapImage = options.publishMapImage !== undefined ? options.publishMapImage : true;

    this.events = options.events;

    this.topics = {
        map: this.topicPrefix + "/" + this.identifier + "/map",
        homeassistant_autoconf_map: this.autoconfPrefix + "/camera/" + this.topicPrefix + "_" + this.identifier + "_map/config"
    };

    this.autoconf_payloads = {
        map: {
            name: this.identifier + " Map",
            unique_id: this.identifier + "_map",
            device: { name: this.identifier, identifiers: [ this.identifier ] },
            topic: this.topics.map
        }
    };

    this.lastMapDraw = new Date(0);

    this.mapDrawer = new MapDrawer({
        settings: this.mapSettings
    })

    this.connect();
};

MqttClient.prototype.connect = function() {
    if(!this.client || (this.client && this.client.connected === false && this.client.reconnecting === false)) {
        const options = {};
        if (this.caPath) {
            options.ca = fs.readFileSync(this.caPath);
        }
        this.client = mqtt.connect(this.brokerURL, options);
        console.log("Connecting to MQTT Broker");

        this.client.on("connect", () => {
            console.info("Connected to MQTT Broker");

            this.client.subscribe([
                this.mapDataTopic
            ], err => {
                if(!err) {
                    this.client.publish(this.topics.homeassistant_autoconf_map, JSON.stringify(this.autoconf_payloads.map), {
                        retain: true
                    });

                } else {
                    //TODO: needs more error handling
                    console.error(err);
                }
            });
        });

        this.client.on("message", (topic, message) => {
            try {
                this.updateMapTopic(JSON.parse(message));
            } catch(e) {
                console.error(e);
            }
        });

        this.client.on("error", (err) => {
            console.error(err);
        })
    }
};

MqttClient.prototype.updateMapTopic = function(parsedMapData) {
    const now = new Date();
    if(now - this.minMillisecondsBetweenMapUpdates > this.lastMapDraw) {
        this.lastMapDraw = now;
        if(this.client && this.client.connected === true) {
            this.mapDrawer.drawMap(parsedMapData).then(buf => {
                if(this.publishMapImage) {
                    this.client.publish(this.topics.map, buf, {retain: true});
                }

                this.events.emit("valetudo.rendered_map", {
                    parsedMapData: parsedMapData,
                    mapImage: buf
                })
            }).catch(err => {
                console.error(err);
            })

        }
    }
};

module.exports = MqttClient;
