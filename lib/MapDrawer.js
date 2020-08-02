const path = require("path");
const Jimp = require("jimp");

const canvas = require('canvas');

const chargerImagePath = path.join(__dirname, '../assets/img/charger.png');
const robotImagePath = path.join(__dirname, '../assets/img/robot.png');

class MapDrawer {
    /**
     *
     * @param options
     * @param options.settings {object}
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
            autoCrop: true
        }, options.settings);

        // parse colors
        const defaultColors = {
            floor: "#0076ff",
            obstacle_weak: "#6699ff",
            obstacle_strong: "#52aeff",
            path: "#ffffff"
        };
        this.colors = Object.assign(defaultColors,
            options.settings.colors);
    }

    async drawMap(mapData) {
        let renderedMap;
        let BOUNDS;

        if(mapData && mapData.__class === "ValetudoMap" && mapData.metaData && mapData.metaData.version === 1) {
            renderedMap = await this.drawValetudoMapV1(mapData);
            BOUNDS = {
                x1: Math.min(this.settings.crop_x1, mapData.size.x / mapData.pixelSize-1),
                x2: Math.min(this.settings.crop_x2, mapData.size.x / mapData.pixelSize),
                y1: Math.min(this.settings.crop_y1, mapData.size.y / mapData.pixelSize-1),
                y2: Math.min(this.settings.crop_y2, mapData.size.y / mapData.pixelSize),
            };
        } else {
            renderedMap = await this.drawOldMap(mapData);
            BOUNDS = {
                x1: Math.min(this.settings.crop_x1, mapData.image.dimensions.width-1),
                x2: Math.min(this.settings.crop_x2, mapData.image.dimensions.width),
                y1: Math.min(this.settings.crop_y1, mapData.image.dimensions.height-1),
                y2: Math.min(this.settings.crop_y2, mapData.image.dimensions.height),
            };
        }

        return this.processDrawnMap(renderedMap, BOUNDS);
    }

    async processDrawnMap(mapBuffer, bounds) {
        const image = await Jimp.read(mapBuffer);

        // Step 8: Load, scale and draw overlay image
        if (this.settings.overlay_path) {
            const overlayImage = await Jimp.read(this.settings.overlay_path);

            overlayImage.scale(this.settings.overlay_scale, Jimp.AUTO);
            image.composite(overlayImage, this.settings.overlay_x, this.settings.overlay_y);
        }

        // Step 9: Load, scale and draw underlay image
        if (this.settings.underlay_path) {
            const underlayImage = await Jimp.read(this.settings.underlay_path);

            underlayImage.scale(this.settings.underlay_scale, Jimp.AUTO);
            image.composite(underlayImage, this.settings.underlay_x, this.settings.underlay_y, {
                mode: Jimp.BLEND_DESTINATION_OVER
            });
        }

        image.crop(
            Math.min(bounds.x1 * this.settings.scale, image.bitmap.width),
            Math.min(bounds.y1 * this.settings.scale, image.bitmap.height),
            Math.min(bounds.x2 * this.settings.scale, image.bitmap.width) - Math.min(bounds.x1 * this.settings.scale, image.bitmap.width),
            Math.min(bounds.y2 * this.settings.scale, image.bitmap.height) - Math.min(bounds.y1 * this.settings.scale, image.bitmap.height)
        );

        if(this.settings.autoCrop === true) {
            image.autocrop();
        }

        return image.getBufferAsync(Jimp.AUTO);
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

        const BOUNDS = {
            x1: Math.min(this.settings.crop_x1, mapData.image.dimensions.width-1),
            x2: Math.min(this.settings.crop_x2, mapData.image.dimensions.width),
            y1: Math.min(this.settings.crop_y1, mapData.image.dimensions.height-1),
            y2: Math.min(this.settings.crop_y2, mapData.image.dimensions.height),
        };

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
                Math.floor((point[0]/50 - mapData.image.position.left) *this.settings.scale),
                Math.floor((point[1]/50 - mapData.image.position.top) *this.settings.scale)
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
                robotImage.rotate(-1 * mapData.path.current_angle-90),
                robotCoords.x * this.settings.scale - robotImage.bitmap.width / 2,
                robotCoords.y * this.settings.scale - robotImage.bitmap.height / 2
            )
        }

        return image.getBufferAsync(Jimp.AUTO);
    }

    async drawValetudoMapV1(mapData) {
        const MapDrawer = require("../js-modules/map-drawer");
        const PathDrawer = require("../js-modules/path-drawer");
        const mapDrawer = new MapDrawer();
        const pathDrawer = new PathDrawer();

        const fullCanvas = canvas.createCanvas(mapData.size.x / mapData.pixelSize, mapData.size.y / mapData.pixelSize);
        const ctx = fullCanvas.getContext("2d");

        const charger_location = mapData.entities.find(e => e.type === "charger_location");
        const robot_position = mapData.entities.find(e => e.type === "robot_position");
        const path = mapData.entities.find(e => e.type === "path");
        const predicted_path = mapData.entities.find(e => e.type === "predicted_path");
        const no_go_areas = mapData.entities.filter(e => e.type === "no_go_area");
        const virtual_walls = mapData.entities.filter(e => e.type === "virtual_wall");

        mapDrawer.draw(mapData.layers);

        pathDrawer.scale(this.settings.scale)

        pathDrawer.setPath(
            path ? path : undefined,
            robot_position ? robot_position : undefined,
            charger_location ? charger_location.points : undefined,
            predicted_path ? predicted_path : undefined
        );
        pathDrawer.draw();

        let jimpImage = await Jimp.read(await mapDrawer.canvas.toBuffer());

        jimpImage.scale(this.settings.scale, Jimp.RESIZE_NEAREST_NEIGHBOR);

        jimpImage.composite(
            await Jimp.read(await pathDrawer.canvas.toBuffer()),
            0,
            0
        );

        return jimpImage.getBufferAsync(Jimp.AUTO);
    }
}

module.exports = MapDrawer;
