const fs = require("fs");
const mqtt = require("mqtt");
const zlib = require("zlib");
const Tools = require("./Tools");
const RRMapParser = require("./RRMapParser");

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
            name: this.identifier + "_map",
            unique_id: this.identifier + "_map",
            topic: this.topics.map
        }
    };

    this.lastMapDraw = new Date(0);

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
                if (message[0x00] === 0x1f && message[0x01] === 0x8b) { // gzipped data
                    this.updateMapTopic(message, true);
                } else {
                    this.updateMapTopic(JSON.parse(message), false);
                }
            } catch(e) {
                console.error(e);
            }
        });

        this.client.on("error", (err) => {
            console.error(err);
        })
    }
};

MqttClient.prototype.updateMapTopic = function(mapData, isBinary) {
    const now = new Date();
    if(now - this.minMillisecondsBetweenMapUpdates > this.lastMapDraw) {
        this.lastMapDraw = now;
        if(this.client && this.client.connected === true) {
            new Promise((resolve,reject) => {
                if (isBinary) {
                    zlib.gunzip(mapData, (err, data) => {
                        if (!err) {
                            resolve(RRMapParser.PARSE(data));
                        } else {
                            reject(err);
                        }
                    });
                } else {
                    resolve(mapData);
                }
            }).then(parsedMapData => {
                Tools.DRAW_MAP_PNG({
                    parsedMapData: parsedMapData,
                    settings: this.mapSettings
                }, (err, buf) => {
                    if (!err) {
                        if(this.publishMapImage) {
                            this.client.publish(this.topics.map, buf, {retain: true});
                        }
                        this.events.emit("valetudo.rendered_map", {
                            parsedMapData: parsedMapData,
                            mapImage: buf
                        })
                    } else {
                        console.error(err);
                    }
                });
            }).catch(err => console.log(err));
        }
    }
};

module.exports = MqttClient;
