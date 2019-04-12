const mqtt = require("mqtt");
const Tools = require("./Tools");

/**
 *
 * @param options {object}
 * @param options.brokerURL {string}
 * @param options.identifier {string}
 * @param options.topicPrefix {string}
 * @param options.autoconfPrefix {string}
 * @param options.mapSettings {object}
 * @param options.mapDataTopic {string}
 * @constructor
 */
const MqttClient = function(options) {
    this.brokerURL = options.brokerURL;
    this.identifier = options.identifier || "rockrobo";
    this.topicPrefix = options.topicPrefix || "valetudo";
    this.autoconfPrefix = options.autoconfPrefix || "homeassistant";
    this.mapSettings = options.mapSettings || {};
    this.mapDataTopic = options.mapDataTopic || "valetudo/rockrobo/map_data";

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

    this.connect();
};

MqttClient.prototype.connect = function() {
    if(!this.client || (this.client && this.client.connected === false && this.client.reconnecting === false)) {
        this.client = mqtt.connect(this.brokerURL);

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
    if(this.client && this.client.connected === true) {
        Tools.DRAW_MAP_PNG({
            parsedMapData: parsedMapData,
            settings: this.mapSettings
        }, (err, buf) => {
            if (!err) {
                this.client.publish(this.topics.map, buf, {retain: true});
            } else {
                console.error(err);
            }
        })
    }
};

module.exports = MqttClient;
