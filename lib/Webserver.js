const compression = require("compression");
const express = require("express");

const Logger = require("./Logger");

class WebServer {
    /**
     * @param {object} options
     * @param {number} options.port
     * @param {object} options.mapData
     * @class
     */
    constructor(options) {
        this.port = options.port;
        this.mapData = options.mapData;

        this.app = express();
        this.app.use(compression());


        this.app.get("/api/map/image", (req,res) => {
            if (this.mapData && this.mapData.img) {
                res.contentType("image/png");
                res.end(this.mapData.img, "binary");
            } else {
                res.sendStatus(404);
            }
        });

        this.app.get("/api/map/base64", (req,res) => {
            if (this.mapData && this.mapData.base64) {
                res.contentType("text/plain");
                res.end(this.mapData.base64);
            } else {
                res.sendStatus(404);
            }
        });

        this.app.get("/api/map/raw", (req,res) => {
            if (this.mapData && this.mapData.raw) {
                res.json(this.mapData.raw);
            } else {
                res.sendStatus(404);
            }
        });

        this.app.listen(this.port, () => {
            Logger.info("Webserver running on port " + this.port);
        });
    }
}

module.exports = WebServer;
