const fs = require("fs");
const mqtt = require("mqtt");
const zlib = require("zlib");

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
 *
 * @param {object} options.mapData
 * @constructor
 */
const MqttClient = function (options) {
    this.brokerURL = options.brokerURL;
    this.caPath = options.caPath || "";
    this.identifier = options.identifier || "rockrobo";
    this.topicPrefix = options.topicPrefix || "valetudo";
    this.autoconfPrefix = options.autoconfPrefix || "homeassistant";
    this.mapSettings = options.mapSettings || {};
    this.mapDataTopic = options.mapDataTopic || "valetudo/rockrobo/map_data";
    this.minMillisecondsBetweenMapUpdates = options.minMillisecondsBetweenMapUpdates || 1000;
    this.publishMapImage = options.publishMapImage !== undefined ? options.publishMapImage : true;

    this.topics = {
        map: this.topicPrefix + "/" + this.identifier + "/map",
        homeassistant_autoconf_map: this.autoconfPrefix + "/camera/" + this.topicPrefix + "_" + this.identifier + "_map/config"
    };

    this.autoconf_payloads = {
        map: {
            name: this.identifier + " Rendered Map",
            unique_id: this.identifier + "_rendered_map",
            device: { name: this.identifier, identifiers: [this.identifier] },
            topic: this.topics.map
        }
    };

    this.lastMapDraw = new Date(0);

    this.mapDrawer = new MapDrawer({
        settings: this.mapSettings
    });

    this.mapData = options.mapData;

    this.parsedMap = {};
    this.lastParsedMap = {};
    this.drawingMap = false;
    this.skipLayers = false;

    this.connect();

    setInterval(() => {
        if (this.drawingMap) {
            console.warn("Skipping map generation as it would be overrunning.");
            return;
        }
        if (!this.client || !this.client.connected) {
            return;
        }
        if (!this.parsedMap) {
            return;
        }
        // Check whether anything changed.
        if (JSON.stringify(this.parsedMap) === JSON.stringify(this.lastParsedMap)) {
            //console.log("Skipping map generation as it has not changed.");
            return;
        }
        // Check whether layers did not change.
        if (this.parsedMap.layers && this.parsedMap.layers.length && this.lastParsedMap.layers && this.lastParsedMap.layers.length && JSON.stringify(this.parsedMap.layers) === JSON.stringify(this.lastParsedMap.layers)) {
            this.skipLayers = true;
            console.log("Skipping layers generation as they have not changed.");
        } else {
            this.skipLayers = false;
        }
        this.lastParsedMap = this.parsedMap;
        this.mapDrawer.updateMap(this.parsedMap);
        this.drawingMap = true;
        console.log("Drawing map...");
        console.time("drawMap");
        const img = this.mapDrawer.draw(this.skipLayers);
        console.timeEnd("drawMap");
        console.log("Map drawn.");

        this.mapData.img = img;

        if (this.publishMapImage) {
            this.client.publish(this.topics.map, img, { retain: true });
            console.log("Map published.");
        }
        this.drawingMap = false;
    }, this.minMillisecondsBetweenMapUpdates);
};

MqttClient.prototype.connect = function () {
    if (!this.client || (this.client && !this.client.connected && !this.client.reconnecting)) {
        const options = {};
        if (this.caPath) {
            options.ca = fs.readFileSync(this.caPath);
        }
        this.client = mqtt.connect(this.brokerURL, options);
        console.log("Connecting to MQTT broker...");

        this.client.on("connect", () => {
            console.log("Connected to MQTT broker.");

            this.client.subscribe([
                this.mapDataTopic
            ], err => {
                if (!err) {
                    this.client.publish(this.topics.homeassistant_autoconf_map, JSON.stringify(this.autoconf_payloads.map), {
                        retain: true
                    });

                } else {
                    console.error(err);
                }
            });
        });

        this.client.on("message", (_, message) => {
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
                        console.error(e);
                    }
                }
                if (isCompressed(message)) {
                    message = zlib.inflateSync(message);
                }
                this.parsedMap = JSON.parse(message);
            } catch (e) {
                console.error(e);
            }

            this.mapData.raw = this.parsedMap;
        }).on("error", console.error);
    }
};

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
        if (name === 'IEND') {
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

            return new Uint8Array(chunkData.slice(i + 2));
        }
    }

    if (!ended) {
        throw new Error('.png file ended prematurely: no IEND header was found');
    }

    throw new Error('No ValetudoMap chunk found in the PNG');
}

function isCompressed(data) {
    return data[0x00] === 0x78;
}

module.exports = MqttClient;
