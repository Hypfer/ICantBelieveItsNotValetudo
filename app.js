const Configuration = require("./lib/Configuration");
const Logger = require("./lib/Logger");
const MqttClient = require("./lib/MqttClient");
const WebServer = require("./lib/Webserver");

const conf = new Configuration();
const mapData = {};

try {
    Logger.LogLevel = conf.get("logLevel");
} catch (e) {
    Logger.error("Initialising Logger: " + e);
}

if (conf.get("mqtt")) {
    // eslint-disable-next-line no-unused-vars
    const mqttClient = new MqttClient({
        brokerURL: conf.get("mqtt").broker_url,
        caPath: conf.get("mqtt").caPath,
        identifier: conf.get("mqtt").identifier,
        topicPrefix: conf.get("mqtt").topicPrefix,
        autoconfPrefix: conf.get("mqtt").autoconfPrefix,
        mapSettings: conf.get("mapSettings"),
        mapDataTopic: conf.get("mqtt").mapDataTopic,
        minMillisecondsBetweenMapUpdates: conf.get("mqtt").minMillisecondsBetweenMapUpdates,
        publishMapImage: conf.get("mqtt").publishMapImage,
        publishAsBase64: conf.get("mqtt").publishAsBase64,

        mapData: mapData
    });

    if (conf.get("webserver") && conf.get("webserver").enabled === true) {
        // eslint-disable-next-line no-unused-vars
        const webServer = new WebServer({
            port: conf.get("webserver").port,
            mapData: mapData
        });
    }
} else {
    Logger.error("Missing configuration.mqtt!");
}
