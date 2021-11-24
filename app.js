const Configuration = require("./lib/Configuration");
const Logger = require("./lib/Logger");
const MqttClient = require("./lib/MqttClient");
const WebServer = require("./lib/Webserver");

const conf = new Configuration();
const mapData = [];

try {
    Logger.LogLevel = conf.get(0, "logLevel");
} catch (e) {
    Logger.error("Initialising Logger: " + e);
}

for (var i = 0; i < conf.getConfigCount(); i++) {
    mapData.push({});

    if (conf.get(i, "mqtt")) {
        // eslint-disable-next-line no-unused-vars
        const mqttClient = new MqttClient({
            brokerURL: conf.get(i, "mqtt").broker_url,
            caPath: conf.get(i, "mqtt").caPath,
            identifier: conf.get(i, "mqtt").identifier,
            topicPrefix: conf.get(i, "mqtt").topicPrefix,
            autoconfPrefix: conf.get(i, "mqtt").autoconfPrefix,
            mapSettings: conf.get(i, "mapSettings"),
            mapDataTopic: conf.get(i, "mqtt").mapDataTopic,
            minMillisecondsBetweenMapUpdates: conf.get(i, "mqtt").minMillisecondsBetweenMapUpdates,
            publishMapImage: conf.get(i, "mqtt").publishMapImage,
            publishAsBase64: conf.get(i, "mqtt").publishAsBase64,

            mapData: mapData[i]
        });

        if (conf.get(i, "webserver") && conf.get(i, "webserver").enabled === true) {
            // eslint-disable-next-line no-unused-vars
            const webServer = new WebServer({
                port: conf.get(i, "webserver").port,
                mapData: mapData[i]
            });
        }
    } else {
        Logger.error("Missing configuration.mqtt!");
    }

}
