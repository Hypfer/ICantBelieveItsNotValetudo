const path = require("path");
const Jimp = require("jimp");

const {createCanvas} = require('canvas');

const chargerImagePath = path.join(__dirname, '../assets/img/charger.png');
const robotImagePath = path.join(__dirname, '../assets/img/robot.png');

class MapDrawer {

    /**
     * @param options
     * @param options.settings {Configuration}
     * @param options.settings.colors {object}
     * //TODO: extend jsdoc
     */
    constructor(options) {

        this.settings = Object.assign({
            drawPath: true,
            drawCharger: true,
            drawRobot: true,
            scale: 4,
            crop_x1: 0,
            crop_x2: Number.MAX_VALUE,
            crop_y1: 0,
            crop_y2: Number.MAX_VALUE,
            overlay_path: null,
            overlay_scale: 1,
            overlay_x: 0,
            overlay_y: 0,
            underlay_path: null,
            underlay_scale: 1,
            underlay_x: 0,
            underlay_y: 0,
            autoCrop: true,
            rotate: 0
        }, options.settings);

        // parse colors
        const defaultColors = {
            floor: "#0076ff",
            obstacle_weak: "#6699ff",
            obstacle_strong: "#333333",
            path: "#ffffff",
            segments: ["#19A1A1", "#7AC037", "#DF5618", "#F7C841"]
        };
        this.colors = Object.assign(defaultColors,
            options.settings.colors);
    }

    /**
     *
     * @param {number[]} pixels
     * @param {{x1: number, x2: number, y1: number, y2: number}} bounds
     *
     * @returns {number[]}
     */
    cropMapPixels(pixels, bounds) {
        const arr = [];

        for (let i = 0; i < pixels.length; i = i + 2) {
            let x = pixels[i];
            let y = pixels[i + 1];
            if (x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2) {
                arr.push(x - bounds.x1)
                arr.push(y - bounds.y1)
            }
        }
        return arr;
    }

    /**
     * @param mapData
     * @returns {{layers: *}}
     */
    cropMapData(mapData) {
        const mapBounds = this.mapBounds(mapData);

        return {...mapData, layers: mapData.layers.map(layer => ({...layer, pixels: this.cropMapPixels(layer.pixels, mapBounds)}))}
    }

    async drawMap(mapData) {
        let imageCanvas;
        let BOUNDS;

        if (mapData && mapData.__class === "ValetudoMap" && mapData.metaData && mapData.metaData.version === 1) {
            console.time('drawValetudoMapV1')
            // BOUNDS = {
            //     x1: Math.min(this.settings.crop_x1, mapData.size.x / mapData.pixelSize - 1),
            //     x2: Math.min(this.settings.crop_x2, mapData.size.x / mapData.pixelSize),
            //     y1: Math.min(this.settings.crop_y1, mapData.size.y / mapData.pixelSize - 1),
            //     y2: Math.min(this.settings.crop_y2, mapData.size.y / mapData.pixelSize),
            // };
            imageCanvas = await this.drawValetudoMapV1(this.cropMapData(mapData));
            console.timeEnd('drawValetudoMapV1')
        } else {
            BOUNDS = {
                x1: Math.min(this.settings.crop_x1, mapData.image.dimensions.width - 1),
                x2: Math.min(this.settings.crop_x2, mapData.image.dimensions.width),
                y1: Math.min(this.settings.crop_y1, mapData.image.dimensions.height - 1),
                y2: Math.min(this.settings.crop_y2, mapData.image.dimensions.height),
            };
            imageCanvas = await this.drawOldMap(this.cropMapData(mapData, BOUNDS));
        }

        return imageCanvas.toBuffer();
    }

    /**
     * @async
     * @param imageCanvas Canvas
     * @param bounds
     * @returns {Promise<Image>}
     */
    async processDrawnMap(imageCanvas, bounds) {

        // Step 8: Load, scale and draw overlay image
        // if (this.settings.overlay_path) {
        //     const overlayImage = await Jimp.read(this.settings.overlay_path);
        //
        //     overlayImage.scale(this.settings.overlay_scale, Jimp.AUTO);
        //     image.composite(overlayImage, this.settings.overlay_x, this.settings.overlay_y);
        // }
        //
        // // Step 9: Load, scale and draw underlay image
        // if (this.settings.underlay_path) {
        //     const underlayImage = await Jimp.read(this.settings.underlay_path);
        //
        //     underlayImage.scale(this.settings.underlay_scale, Jimp.AUTO);
        //     image.composite(underlayImage, this.settings.underlay_x, this.settings.underlay_y, {
        //         mode: Jimp.BLEND_DESTINATION_OVER
        //     });
        // }
        //
        // // Step 10: Rotate map
        // if (this.settings.rotate) {
        //     image.rotate(this.settings.rotate);
        // }
// console.log(imageCanvas)
        // image.crop(
        //     Math.min(bounds.x1 * this.settings.scale, image.width),
        //     Math.min(bounds.y1 * this.settings.scale, image.height),
        //     Math.min(bounds.x2 * this.settings.scale, image.width) - Math.min(bounds.x1 * this.settings.scale, image.width),
        //     Math.min(bounds.y2 * this.settings.scale, image.height) - Math.min(bounds.y1 * this.settings.scale, image.height)
        // );

        // let x1 = Math.min(bounds.x1, image.width);
        // let y1 = Math.min(bounds.y1, image.height);
        // let x2 = Math.min(bounds.x2, image.width) - Math.min(bounds.x1, image.width);
        // let y2 = Math.min(bounds.y2, image.height) - Math.min(bounds.y1, image.height);
        //
        // console.log(x1, y1, x2, y2);

        // let croppedImage = new canvas.Image();
        // console.log(croppedImage)
        // var sourceX = Math.min(bounds.x1, imageCanvas.width);
        // var sourceY = Math.min(bounds.y1, imageCanvas.height);
        // var sourceWidth = Math.min(bounds.x2, imageCanvas.width) - Math.min(bounds.x1, imageCanvas.width);
        // var sourceHeight = Math.min(bounds.y2, imageCanvas.height) - Math.min(bounds.y1, imageCanvas.height);
        // var destWidth = sourceWidth;
        // var destHeight = sourceHeight;
        // var destX = imageCanvas.width / 2 - destWidth / 2;
        // var destY = imageCanvas.height / 2 - destHeight / 2;
        //
        // console.log("sourceX", sourceX)
        // console.log("sourceY", sourceY)
        // console.log("sourceWidth", sourceWidth)
        // console.log("sourceHeight", sourceHeight)
        //
        // imageCanvas.drawImage(croppedImage, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
        //
        // let ctx1 = imageCanvas.getContext("2d");
        // ctx1.rect(0, 0, destWidth, sourceHeight);
        // ctx1.fillStyle = 'white';
        // ctx1.fill();
        // ctx1.putImageData(croppedImage, 0, 0);

        // if(this.settings.autoCrop === true) {
        //     image.autocrop();
        // }
        // croppedImage.globalCompositeOperation = "destination-over";

        return imageCanvas.toBuffer();
    }

    async drawOldMap(mapData) {
        const colors = {};
        Object.keys(this.colors).forEach(k => {
            colors[k] = Jimp.cssColorToHex(this.colors[k]);
        })

        const chargerImage = await Jimp.read(chargerImagePath);
        const robotImage = await Jimp.read(robotImagePath);

        const DIMENSIONS = {
            width: mapData.image.dimensions.width,
            height: mapData.image.dimensions.height
        };

        // const BOUNDS = {
        //     x1: Math.min(this.settings.crop_x1, mapData.image.dimensions.width - 1),
        //     x2: Math.min(this.settings.crop_x2, mapData.image.dimensions.width),
        //     y1: Math.min(this.settings.crop_y1, mapData.image.dimensions.height - 1),
        //     y2: Math.min(this.settings.crop_y2, mapData.image.dimensions.height),
        // };

        const image = await new Jimp(DIMENSIONS.width, DIMENSIONS.height);

        Object.keys(mapData.image.pixels).forEach(key => {
            const color = colors[key] || colors.floor;

            //Map Drawing
            mapData.image.pixels[key].forEach(function drawPixel(px) {
                image.setPixelColor(color, px[0], px[1]);
            });
        });

        //Step 2: Scale
        image.scale(this.settings.scale, Jimp.RESIZE_NEAREST_NEIGHBOR);

        //Step 3: Draw Path
        const coords = mapData.path.points.map(point => {
            return [
                Math.floor((point[0] / 50 - mapData.image.position.left) * this.settings.scale),
                Math.floor((point[1] / 50 - mapData.image.position.top) * this.settings.scale)
            ]
        });
        let first = true;
        let oldPathX, oldPathY; // old Coordinates
        let dx, dy; //delta x and y
        let step, x, y, i;
        coords.forEach((coord) => {
            if (!first && this.settings.drawPath) {
                dx = (coord[0] - oldPathX);
                dy = (coord[1] - oldPathY);
                if (Math.abs(dx) >= Math.abs(dy)) {
                    step = Math.abs(dx);
                } else {
                    step = Math.abs(dy);
                }
                dx = dx / step;
                dy = dy / step;
                x = oldPathX;
                y = oldPathY;
                i = 1;
                while (i <= step) {
                    image.setPixelColor(colors.path, x, y);
                    x = x + dx;
                    y = y + dy;
                    i = i + 1;
                }
            }
            oldPathX = coord[0];
            oldPathY = coord[1];
            first = false;
        });

        //Step 6: Draw Charger
        if (this.settings.drawCharger === true && mapData.charger) {
            const chargerCoords = {
                x: mapData.charger[0] / 50 - mapData.image.position.left,
                y: mapData.charger[1] / 50 - mapData.image.position.top
            };

            image.composite(
                chargerImage,
                chargerCoords.x * this.settings.scale - chargerImage.bitmap.width / 2,
                chargerCoords.y * this.settings.scale - chargerImage.bitmap.height / 2
            );
        }

        //Step 7: Draw Robot
        if (this.settings.drawRobot === true && mapData.robot) {
            const robotCoords = {
                x: mapData.robot[0] / 50 - mapData.image.position.left,
                y: mapData.robot[1] / 50 - mapData.image.position.top
            };

            image.composite(
                robotImage.rotate(-1 * mapData.path.current_angle - 90),
                robotCoords.x * this.settings.scale - robotImage.bitmap.width / 2,
                robotCoords.y * this.settings.scale - robotImage.bitmap.height / 2
            )
        }

        return image.getBufferAsync(Jimp.AUTO);
    }

    /**
     *
     * @param mapData
     * @returns {Promise<Canvas>}
     */
    async drawValetudoMapV1(mapData) {
        const MapDrawer = require("../js-modules/map-drawer");
        const PathDrawer = require("../js-modules/path-drawer");
        const mapDrawer = new MapDrawer(this.colors);
        const pathDrawer = new PathDrawer(this.colors.path);

        const mapCanvas = mapDrawer.draw(mapData.layers, this.settings.scale);

        const fullCanvas = createCanvas(mapCanvas.width, mapCanvas.height);
        const ctx = fullCanvas.getContext("2d");
ctx.fillRect(0, 0, mapCanvas.width, mapCanvas.height)

        const chargerLocation = mapData.entities.find(e => e.type === "charger_location");
        const robotPosition = mapData.entities.find(e => e.type === "robot_position");
        const path = mapData.entities.find(e => e.type === "path");
        const predictedPath = mapData.entities.find(e => e.type === "predicted_path");
        const noGoAreas = mapData.entities.filter(e => e.type === "no_go_area");
        const virtualWalls = mapData.entities.filter(e => e.type === "virtual_wall");

        ctx.drawImage(mapCanvas, 0, 0, mapCanvas.width, mapCanvas.height)

        pathDrawer.draw(
            ctx,
            this.settings.scale,
            this.scalePoints(path.points, mapData.pixelSize),
            this.scalePoints(robotPosition.points, mapData.pixelSize),
            robotPosition.metaData.angle,
            this.scalePoints(chargerLocation.points, mapData.pixelSize),
            predictedPath ? predictedPath.points : [])

        return fullCanvas;
    }

    /**
     * @param {number[]} points
     * @param {number} scale
     *
     * @returns {Number[]}
     */
    scalePoints(points, scale) {
        return points.map((p, i) => {
            if (i % 2 === 0) {
                return p - scale * this.settings.crop_x1
            } else {
                return p - scale * this.settings.crop_y1
            }
        })
    }

    /**
     * Finds min and max dimensions of map data
     *
     * @param mapData
     *
     * @returns {{x1: number, x2: number, y1: number, y2: number}}
     */
    mapBounds(mapData) {
        return {
            x1: Math.min(...mapData.layers.flatMap(layer => layer.dimensions.x.min)),
            x2: Math.max(...mapData.layers.flatMap(layer => layer.dimensions.x.max)),
            y1: Math.min(...mapData.layers.flatMap(layer => layer.dimensions.y.min)),
            y2: Math.max(...mapData.layers.flatMap(layer => layer.dimensions.y.max)),
        }
    }
}

module.exports = MapDrawer;
