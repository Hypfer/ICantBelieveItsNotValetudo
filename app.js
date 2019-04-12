const Configuration = require("./lib/Configuration");
const MqttClient = require("./lib/MqttClient");

const conf = new Configuration();

if(conf.get("mqtt") && conf.get("mqtt").enabled === true) {
    new MqttClient({
        brokerURL: conf.get("mqtt").broker_url,
        identifier: conf.get("mqtt").identifier,
        topicPrefix: conf.get("mqtt").topicPrefix,
        autoconfPrefix: conf.get("mqtt").autoconfPrefix,
        mapSettings: conf.get("mqtt").mapSettings,
        mapDataTopic: conf.get("mqtt").mapDataTopic
    });
}