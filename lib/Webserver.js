const express = require("express");
const compression = require("compression");

/**
 *
 * @param {object} options
 * @param {number} options.port
 * @param {object} options.mapData
 * @constructor
 */
const WebServer = function(options) {
    const self = this;

    this.port = options.port;
    this.mapData = options.mapData;

    this.app = express();
    this.app.use(compression());


    this.app.get("/api/map/image", (req,res) => {
        if(this.mapData && this.mapData.img) {
            res.contentType('image/png');
            res.end(this.mapData.img, 'binary');
        } else {
            res.sendStatus(404);
        }
    });

    this.app.get("/api/map/raw", (req,res) => {
        if(this.mapData && this.mapData.raw) {
            res.json(this.mapData.raw);
        } else {
            res.sendStatus(404);
        }
    });

    this.app.listen(this.port, function(){
        console.log("Webserver running on port", self.port)
    })
};

module.exports = WebServer;
