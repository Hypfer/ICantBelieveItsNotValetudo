const fs = require("fs");
const mqtt = require("mqtt");
const zlib = require("zlib");

const Logger = require("./Logger");
const MapDrawer = require("./MapDrawer");
const Tools = require("./Tools");

class MqttClient {
    /**
     *
     * @param {object}options
     * @param {string} options.brokerURL
     * @param {string} options.clientId
     * @param {string} options.caPath
     * @param {string} options.identifier
     * @param {string} options.topicPrefix
     * @param {string} options.autoconfPrefix
     * @param {object} options.mapSettings
     * @param {string} options.mapDataTopic
     * @param {number} options.minMillisecondsBetweenMapUpdates
     * @param {boolean} options.publishMapImage
     * @param {boolean} options.publishAsBase64
     *
     *
     * @param {object} options.mapData
     * @class
     */
    constructor(options) {
        this.brokerURL = options.brokerURL;
        this.clientId = options.clientId ?? "";
        this.caPath = options.caPath ?? "";
        this.identifier = options.identifier ?? "rockrobo";
        this.topicPrefix = options.topicPrefix ?? "valetudo";
        this.autoconfPrefix = options.autoconfPrefix ?? "homeassistant";
        this.mapSettings = options.mapSettings ?? {};
        this.mapDataTopic = options.mapDataTopic ?? "valetudo/robot/MapData/map-data";
        this.minMillisecondsBetweenMapUpdates = options.minMillisecondsBetweenMapUpdates ?? 1000;
        this.publishMapImage = options.publishMapImage !== undefined ? options.publishMapImage : true;
        this.publishAsBase64 = options.publishAsBase64 !== undefined ? options.publishAsBase64 : false;

        this.lastMapUpdate = new Date(0).getTime();

        this.topics = {
            map: this.topicPrefix + "/" + this.identifier + "/MapData/map",
            homeassistant_autoconf_map: this.autoconfPrefix + "/camera/" + this.identifier + "/" + this.topicPrefix + "_" + this.identifier + "_map/config"
        };

        this.autoconf_payloads = {
            map: {
                name: "Rendered Map",
                unique_id: this.identifier + "_rendered_map",
                device: { name: this.identifier, identifiers: [this.identifier] },
                topic: this.topics.map
            }
        };
        this.mapDrawer = new MapDrawer({
            settings: this.mapSettings
        });

        this.mapData = options.mapData;

        this.connect();
    }

    connect() {
        if (!this.client || (this.client && !this.client.connected && !this.client.reconnecting)) {
            const options = {};
            if (this.clientId) {
                options.clientId = this.clientId;
            }

            if (this.caPath) {
                options.ca = fs.readFileSync(this.caPath);
            }
            this.client = mqtt.connect(this.brokerURL, options);
            Logger.info("Connecting to MQTT broker...");

            this.client.on("connect", () => {
                Logger.info("Connected to MQTT broker.");

                this.client.subscribe([
                    this.mapDataTopic
                ], err => {
                    if (!err) {
                        this.client.publish(this.topics.homeassistant_autoconf_map, JSON.stringify(this.autoconf_payloads.map), {
                            retain: true
                        });

                    } else {
                        Logger.error("Error while publishing autoconf data", err);
                    }
                });
            });

            this.client.on("message", (topic, message) => {
                try {
                    if (Tools.isPNG(message)) {
                        try {
                            const chunk = Tools.extractZtxtValetudoMapPngChunk(message);

                            if (!chunk) {
                                // noinspection ExceptionCaughtLocallyJS
                                throw new Error("No map data found in image");
                            } else {
                                message = chunk;
                            }
                        } catch (e) {
                            Logger.error(e);
                        }
                    }

                    if (Tools.isCompressed(message)) {
                        message = zlib.inflateSync(message);
                    }

                    const rawMapData = JSON.parse(message.toString());

                    if (this.updateMapData(rawMapData)) {
                        this.renderAndPublishMap();
                    } else {
                        Logger.info("Skipping map render due to \"minMillisecondsBetweenMapUpdates\" being greater than the time since the last map update.");
                    }
                } catch (e) {
                    Logger.error(e);
                }
            }).on("error", Logger.error);
        }
    }

    /**
     * Returns true and updates the internal state of application and mapRenderer with the latest raw map data
     * if it has been minMillisecondsBetweenMapUpdates since the last update
     * 
     * Otherwise, returns false and drop the data
     * 
     * @param {object} rawMapData
     * @return {boolean}
     */
    updateMapData(rawMapData) {
        const now = new Date().getTime();

        if (now - this.minMillisecondsBetweenMapUpdates > this.lastMapUpdate) {
            this.lastMapUpdate = now;

            this.mapData.raw = rawMapData;
            this.mapDrawer.updateMap(this.mapData.raw);

            return true;
        } else {
            return false;
        }
    }

    renderAndPublishMap() {
        Logger.info("Rendering map...");

        const drawStart = process.hrtime();

        const drawn = this.mapDrawer.draw();
        const img = drawn.img;
        const base64 = drawn.base64;

        const drawEnd = process.hrtime(drawStart);

        Logger.info("Map rendered in " + ((drawEnd[0] * 1000000000 + drawEnd[1]) / 1000000) + " ms");

        this.mapData.img = img;
        this.mapData.base64 = base64;

        if (this.publishMapImage) {
            this.client.publish(
                this.topics.map,
                this.publishAsBase64 ? base64 : img,
                {retain: true}
            );
            Logger.info("Map published.");
        }
    }
}
module.exports = MqttClient;
