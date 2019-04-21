const express = require("express");
const compression = require("compression");

/**
 *
 * @param options
 * @param options.port {number}
 * @param options.events {EventEmitter}
 * @constructor
 */
const WebServer = function(options) {
    const self = this;

    this.port = options.port;
    this.events = options.events;

    this.app = express();
    this.app.use(compression());

    this.events.on("valetudo.rendered_map", (renderedMap) => {
        this.latestMap = renderedMap;
    });


    this.app.get("/api/map/image", (req,res) => {
        if(this.latestMap && this.latestMap.mapImage) {
            res.contentType('image/png');
            res.end(this.latestMap.mapImage, 'binary');
        } else {
            res.sendStatus(404);
        }
    });

    this.app.get("/api/map/raw", (req,res) => {
        if(this.latestMap && this.latestMap.parsedMapData) {
            res.json(this.latestMap.parsedMapData);
        } else {
            res.sendStatus(404);
        }
    });

    this.app.listen(this.port, function(){
        console.log("Webserver running on port", self.port)
    })
};

module.exports = WebServer;