const Configuration = require("./lib/Configuration");
const MqttClient = require("./lib/MqttClient");

const conf = new Configuration();

if (conf.get("mqtt")) {
    new MqttClient({
        brokerURL: conf.get("mqtt").broker_url,
        caPath: conf.get("mqtt").caPath,
        identifier: conf.get("mqtt").identifier,
        topicPrefix: conf.get("mqtt").topicPrefix,
        autoconfPrefix: conf.get("mqtt").autoconfPrefix,
        mapSettings: conf.get("mapSettings"),
        mapDataTopic: conf.get("mqtt").mapDataTopic,
        minMillisecondsBetweenMapUpdates: conf.get("mqtt").minMillisecondsBetweenMapUpdates,
        publishMapImage: conf.get("mqtt").publishMapImage
    });
} else {
    console.error("Missing configuration.mqtt!");
}
