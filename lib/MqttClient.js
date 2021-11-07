const fs = require("fs");
const mqtt = require("mqtt");
const zlib = require("zlib");

const Logger = require("./Logger");
const MapDrawer = require("./MapDrawer");


class MqttClient {
    /**
     *
     * @param {object}options
     * @param {string} options.brokerURL
     * @param {string} options.caPath
     * @param {string} options.identifier
     * @param {string} options.topicPrefix
     * @param {string} options.autoconfPrefix
     * @param {object} options.mapSettings
     * @param {string} options.mapDataTopic {string}
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
        this.caPath = options.caPath || "";
        this.identifier = options.identifier || "rockrobo";
        this.topicPrefix = options.topicPrefix || "valetudo";
        this.autoconfPrefix = options.autoconfPrefix || "homeassistant";
        this.mapSettings = options.mapSettings || {};
        this.mapDataTopic = options.mapDataTopic || "valetudo/robot/MapData/map-data";
        this.minMillisecondsBetweenMapUpdates = options.minMillisecondsBetweenMapUpdates || 1000;
        this.publishMapImage = options.publishMapImage !== undefined ? options.publishMapImage : true;
        this.publishAsBase64 = options.publishAsBase64 !== undefined ? options.publishAsBase64 : false;

        this.topics = {
            map: this.topicPrefix + "/" + this.identifier + "/MapData/map",
            homeassistant_autoconf_map: this.autoconfPrefix + "/camera/" + this.identifier + "/" + this.topicPrefix + "_" + this.identifier + "_map/config"
        };

        this.autoconf_payloads = {
            map: {
                name: this.identifier + " Rendered Map",
                unique_id: this.identifier + "_rendered_map",
                device: { name: this.identifier, identifiers: [this.identifier] },
                topic: this.topics.map
            }
        };

        this.mapDrawer = new MapDrawer({
            settings: this.mapSettings
        });

        this.mapData = options.mapData;

        this.lastMapData = {};
        this.drawingMap = false;
        this.skipLayers = false;

        this.connect();

        setInterval(() => {
            if (this.drawingMap) {
                Logger.warn("Skipping map generation as it would be overrunning.");
                return;
            }
            if (!this.client || !this.client.connected) {
                return;
            }
            if (!this.mapData.raw) {
                return;
            }

            // Check whether anything changed.
            if (JSON.stringify(this.mapData.raw) === JSON.stringify(this.lastMapData)) {
                Logger.trace("Skipping map generation as it has not changed.");
                return;
            }

            // Check whether layers did not change.
            if (this.mapData.raw.layers && this.mapData.raw.layers.length && this.lastMapData.layers && this.lastMapData.layers.length && JSON.stringify(this.mapData.raw.layers) === JSON.stringify(this.lastMapData.layers)) {
                this.skipLayers = true;
                Logger.debug("Skipping layers generation as they have not changed.");
            } else {
                this.skipLayers = false;
            }

            this.lastMapData = this.mapData.raw;
            this.mapDrawer.updateMap(this.mapData.raw);
            this.drawingMap = true;

            Logger.info("Drawing map...");

            const drawStart = process.hrtime();

            const drawn = this.mapDrawer.draw(this.skipLayers);
            const img = drawn.img;
            const base64 = drawn.base64;

            const drawEnd = process.hrtime(drawStart);

            Logger.info("Map drawn in " + ((drawEnd[0]* 1000000000 + drawEnd[1]) / 1000000) + " ms");

            this.mapData.img = img;
            this.mapData.base64 = base64;

            if (this.publishMapImage) {
                this.client.publish(this.topics.map,
                    this.publishAsBase64? base64 : img, { retain: true });
                Logger.info("Map published.");
            }
            this.drawingMap = false;
        }, this.minMillisecondsBetweenMapUpdates);
    }

    connect() {
        if (!this.client || (this.client && !this.client.connected && !this.client.reconnecting)) {
            const options = {};
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
                    if (isPNG(message)) {
                        try {
                            const chunk = extractZtxtValetudoMapPngChunk(message);

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

                    if (isCompressed(message)) {
                        message = zlib.inflateSync(message);
                    }

                    this.mapData.raw = JSON.parse(message.toString());
                } catch (e) {
                    Logger.error(e);
                }
            }).on("error", Logger.error);
        }
    }
}


function isPNG(data) {
    return data[0] === 0x89 &&
        data[1] === 0x50 &&
        data[2] === 0x4E &&
        data[3] === 0x47 &&
        data[4] === 0x0D &&
        data[5] === 0x0A &&
        data[6] === 0x1A &&
        data[7] === 0x0A;
}

/**
 * This has been adapted for this use-case from https://github.com/hughsk/png-chunks-extract/blob/d098d583f3ab3877c1e4613ec9353716f86e2eec/index.js
 *
 * See https://github.com/hughsk/png-chunks-extract/blob/d098d583f3ab3877c1e4613ec9353716f86e2eec/LICENSE.md for more information.
 */

function extractZtxtValetudoMapPngChunk(data) {
    // Used for fast-ish conversion between uint8s and uint32s/int32s.
    // Also required in order to remain agnostic for both Node Buffers and
    // Uint8Arrays.
    let uint8 = new Uint8Array(4);
    let uint32 = new Uint32Array(uint8.buffer);
    let ended = false;
    let idx = 8;

    while (idx < data.length) {
        // Read the length of the current chunk,
        // which is stored as a Uint32.
        uint8[3] = data[idx++];
        uint8[2] = data[idx++];
        uint8[1] = data[idx++];
        uint8[0] = data[idx++];

        // Chunk includes name/type for CRC check (see below).
        let length = uint32[0] + 4;
        let chunk = new Uint8Array(length);
        chunk[0] = data[idx++];
        chunk[1] = data[idx++];
        chunk[2] = data[idx++];
        chunk[3] = data[idx++];

        // Get the name in ASCII for identification.
        let name = (
            String.fromCharCode(chunk[0]) +
            String.fromCharCode(chunk[1]) +
            String.fromCharCode(chunk[2]) +
            String.fromCharCode(chunk[3])
        );

        // The IEND header marks the end of the file,
        // so on discovering it break out of the loop.
        if (name === "IEND") {
            ended = true;

            break;
        }

        // Read the contents of the chunk out of the main buffer.
        for (let i = 4; i < length; i++) {
            chunk[i] = data[idx++];
        }

        // Skip the CRC32.
        idx += 4;

        // The chunk data is now copied to remove the 4 preceding
        // bytes used for the chunk name/type.
        let chunkData = new Uint8Array(chunk.buffer.slice(4));

        if (name === "zTXt") {
            let i = 0;
            let keyword = "";

            while (chunkData[i] !== 0 && i < 79) {
                keyword += String.fromCharCode(chunkData[i]);

                i++;
            }

            if (keyword !== "ValetudoMap") {
                continue;
            }

            return Buffer.from(chunkData.slice(i + 2));
        }
    }

    if (!ended) {
        throw new Error(".png file ended prematurely: no IEND header was found");
    }

    throw new Error("No ValetudoMap chunk found in the PNG");
}

function isCompressed(data) {
    return data[0x00] === 0x78;
}

module.exports = MqttClient;
