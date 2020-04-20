const fs = require("fs");
const path = require("path");
const Jimp = require("jimp");

const chargerImagePath = path.join(__dirname, '../assets/img/charger.png');
const robotImagePath = path.join(__dirname, '../assets/img/robot.png');


const Tools = {
    DIMENSION_PIXELS: 1024,
    DIMENSION_MM: 50 * 1024,

    MK_DIR_PATH: function (filepath) {
        var dirname = path.dirname(filepath);
        if (!fs.existsSync(dirname)) {
            Tools.MK_DIR_PATH(dirname);
        }
        if (!fs.existsSync(filepath)) {
            fs.mkdirSync(filepath);
        }
    },

    /**
     *
     * @param options {object}
     * @param options.parsedMapData
     * @param options.settings
     * @param callback {function}
     * @constructor
     */
    DRAW_MAP_PNG: function (options, callback) {
        const settings = Object.assign({
            drawPath: true,
            drawCharger: true,
            drawRobot: true,
            border: 2,
            scale: 4,
            crop_x1: 0,
            crop_x2: Number.MAX_VALUE,
            crop_y1: 0,
            crop_y2: Number.MAX_VALUE
        }, options.settings);

        const COLORS = {
            background: Jimp.cssColorToHex('#33a1f5'),
            background2: Jimp.cssColorToHex('#046cd4'),
            floor: Jimp.cssColorToHex('#56affc'),
            obstacle_strong: Jimp.cssColorToHex('#a1dbff'),
            path: Jimp.rgbaToInt(255, 255, 255, 255),
            forbidden_marker: Jimp.rgbaToInt(255, 0, 0, 255),
            forbidden_zone: Jimp.rgbaToInt(255, 0, 0, 96),
            cleaned_marker: Jimp.rgbaToInt(53,125,46,255),
            cleaned_zone: Jimp.rgbaToInt(107,244,66,76),
            cleaned_block: Jimp.rgbaToInt(107,244,36,87)
        };

        const BOUNDS = {
            x1: Math.min(settings.crop_x1, options.parsedMapData.image.dimensions.width-1),
            x2: Math.min(settings.crop_x2, options.parsedMapData.image.dimensions.width),
            y1: Math.min(settings.crop_y1, options.parsedMapData.image.dimensions.height-1),
            y2: Math.min(settings.crop_y2, options.parsedMapData.image.dimensions.height),
        };

        const pointInsideQuadrilateral = function(p,p1,p2,p3,p4) {
            let intersects = 0,
               a = [p4,p1,p2,p3],
               b = [p1,p2,p3,p4];
            for (let i = 0; i < 4; ++i) {
               intersects += intersectsRight(p[0], p[1], a[i][0], a[i][1], b[i][0], b[i][1]);
            }
            return intersects % 2 !== 0;
        };

        const intersectsRight = function(px, py, x1, y1, x2, y2) {
            let tmp;
            if (y1 === y2) return 0;
            if (y1 > y2) {
                tmp = x1; x1 = x2; x2 = tmp;
                tmp = y1; y1 = y2; y2 = tmp;
            }
            if (py < y1 || py >= y2) return 0;
            if (x1 === x2) return px <= x1 ? 1 : 0;
            return px <= x1 + (py - y1) * (x2 - x1) / (y2 - y1) ? 1 : 0;
        };

        const calcOverlayColor = function(background, overlay) {
            return {
                r: Math.min(Math.max(0,Math.round(overlay.a*overlay.r/255 + (1 - overlay.a/255)*background.r)),255),
                g: Math.min(Math.max(0,Math.round(overlay.a*overlay.g/255 + (1 - overlay.a/255)*background.g)),255),
                b: Math.min(Math.max(0,Math.round(overlay.a*overlay.b/255 + (1 - overlay.a/255)*background.b)),255)
            };
        };

        const drawLineByPoints = function(image,points,color) {
            let first = true;
            let oldPathX, oldPathY; // old Coordinates
            let dx, dy; //delta x and y
            let step, x, y, i;
            points.forEach(function (coord) {
                if (!first && settings.drawPath) {
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
                        image.setPixelColor(color, x, y);
                        x = x + dx;
                        y = y + dy;
                        i = i + 1;
                    }
                }
                oldPathX = coord[0];
                oldPathY = coord[1];
                first = false;
            });
        };

        const formatPointCoords = function(point,scale = 1) {
            return [
                Math.floor(point[0]/50 - options.parsedMapData.image.position.left) * scale,
                Math.floor(point[1]/50 - options.parsedMapData.image.position.top) * scale
            ];
        }

        new Jimp(options.parsedMapData.image.dimensions.width, options.parsedMapData.image.dimensions.height, COLORS['background'], function (err, image) {
            if (!err) {
                // Step 1: Draw Map
                ["floor", "obstacle_strong"].forEach(key => {
                    const color = COLORS[key];
                    options.parsedMapData.image.pixels[key].forEach(function drawPixel(px) {
                        image.setPixelColor(color, px[0], px[1]);
                    });
                });
                // Step 1.1: Draw Currently Cleaned Markers
                if (settings.drawCurrentlyCleanedZones && options.parsedMapData.currently_cleaned_zones) {
                    let currentlyCleanedZones = options.parsedMapData.currently_cleaned_zones.map(zone => {
                        return [[zone[0],zone[1]],[zone[2],zone[3]]].map(point => formatPointCoords(point));
                    });
                    currentlyCleanedZones.forEach(zone => {
                        let resultColor, overlayColor = Jimp.intToRGBA(COLORS['cleaned_zone']);
                        image.scan(Math.min(zone[0][0],zone[1][0]), Math.min(zone[0][1],zone[1][1]), Math.max(zone[0][0],zone[1][0]) - Math.min(zone[0][0],zone[1][0]), Math.max(zone[0][1],zone[1][1]) - Math.min(zone[0][1],zone[1][1]), function(x, y, idx) {
                            resultColor = calcOverlayColor({r: this.bitmap.data[idx], g: this.bitmap.data[idx+1], b: this.bitmap.data[idx+2], a: 255},overlayColor);
                            this.bitmap.data[idx + 0] = resultColor.r;
                            this.bitmap.data[idx + 1] = resultColor.g;
                            this.bitmap.data[idx + 2] = resultColor.b;
                        });
                    });
                    currentlyCleanedZones.forEach(zone => {
                        drawLineByPoints(image,[zone[0],[zone[0][0],zone[1][1]],zone[1],[zone[1][0],zone[0][1]],zone[0]],COLORS['cleaned_marker']);
                    });
                }
                if (settings.drawCurrentlyCleanedBlocks && options.parsedMapData.currently_cleaned_blocks) {
                    let resultColor, overlayColor = Jimp.intToRGBA(COLORS['cleaned_block']);
                    options.parsedMapData.currently_cleaned_blocks.forEach(segnum => {
                        if (options.parsedMapData.image.pixels.segments[segnum])
                        options.parsedMapData.image.pixels.segments[segnum].forEach(px => {
                            resultColor = calcOverlayColor(Jimp.intToRGBA(image.getPixelColor(px[0],px[1])),overlayColor);
                            image.setPixelColor(Jimp.rgbaToInt(resultColor.r,resultColor.g,resultColor.b,255),px[0],px[1]);
                        });
                    });
                }
                // Step 1.2: Draw Forbidden Markers
                if (settings.drawForbiddenZones && options.parsedMapData.forbidden_zones) {
                    let forbiddenZones = options.parsedMapData.forbidden_zones.map(zone => {
                        return [[zone[0],zone[1]],[zone[2],zone[3]],[zone[4],zone[5]],[zone[6],zone[7]]].map(point => formatPointCoords(point));
                    });
                    forbiddenZones.forEach(zone => {
                        let resultColor,
                            overlayColor = Jimp.intToRGBA(COLORS['forbidden_zone'])
                            minx = Math.min(zone[0][0],zone[3][0]),
                            miny = Math.max(zone[0][1],zone[1][1]),
                            maxx = Math.max(zone[1][0],zone[2][0]),
                            maxy = Math.max(zone[2][1],zone[3][1]);
                        image.scan(minx, miny, maxx - minx, maxy - miny, function(x, y, idx) {
                            if (pointInsideQuadrilateral([x,y],zone[0],zone[1],zone[2],zone[3])) {
                                resultColor = calcOverlayColor({r: this.bitmap.data[idx], g: this.bitmap.data[idx+1], b: this.bitmap.data[idx+2], a: 255},overlayColor);
                                this.bitmap.data[idx + 0] = resultColor.r;
                                this.bitmap.data[idx + 1] = resultColor.g;
                                this.bitmap.data[idx + 2] = resultColor.b;
                            }
                        });
                    });
                    forbiddenZones.forEach(zone => {
                        drawLineByPoints(image,zone.concat([zone[0]]),COLORS['forbidden_marker']);
                    });
                }
                if (settings.drawVirtualWalls === true && options.parsedMapData.virtual_walls) {
                    let virtualWalls = options.parsedMapData.virtual_walls.map(wall => {
                        return [[wall[0],wall[1]],[wall[2],wall[3]]].map(point => formatPointCoords(point));
                    });
                    virtualWalls.forEach(wall => {
                        drawLineByPoints(image,wall,COLORS['forbidden_marker']);
                    });
                }
                //Step 2: Scale
                image.scale(settings.scale, Jimp.RESIZE_NEAREST_NEIGHBOR);
                //Step 3: Draw Path
                if (options.parsedMapData.path) {
                    drawLineByPoints(image,options.parsedMapData.path.points.map(point => formatPointCoords(point,settings.scale)),COLORS.path);
                }
                //Step 4: Load charger and robot icons
                let chargerImage, robotImage;
                let loadChargerImage = Jimp.read(chargerImagePath).then(loaded => { chargerImage = loaded; });
                let loadRobotImage = Jimp.read(robotImagePath).then(loaded => { robotImage = loaded; });
                Promise.all([loadChargerImage, loadRobotImage]).then(() => {
                    //Step 5: Draw charger
                    if (settings.drawCharger === true && options.parsedMapData.charger) {
                        const chargerCoords = formatPointCoords(options.parsedMapData.charger,settings.scale);
                        chargerImage.scaleToFit(settings.scale * 12, settings.scale * 12, Jimp.RESIZE_BICUBIC);
                        image.composite(
                            chargerImage,
                            chargerCoords[0] - chargerImage.bitmap.width / 2,
                            chargerCoords[1] - chargerImage.bitmap.height / 2
                        );
                    }
                    //Step 6: Draw robot
                    if (settings.drawRobot === true && options.parsedMapData.robot) {
                        const robotCoords = formatPointCoords(options.parsedMapData.robot,settings.scale);
                        if (options.parsedMapData.path) {
                            robotImage.rotate(-1 * options.parsedMapData.path.current_angle-90, false);
                        }
                        robotImage.scaleToFit(settings.scale * 12, settings.scale * 12, Jimp.RESIZE_BICUBIC);
                        image.composite(
                            robotImage,
                            robotCoords[0] - robotImage.bitmap.width / 2,
                            robotCoords[1] - robotImage.bitmap.height / 2
                        )
                    }

                    // Step 7a: Manual crop image
                    if (BOUNDS.x1 !== 0 || BOUNDS.x2 !== options.parsedMapData.image.dimensions.width ||
                        BOUNDS.y1 !== 0 || BOUNDS.y2 !== options.parsedMapData.image.dimensions.height) {
                        image.crop(BOUNDS.x1*settings.scale, BOUNDS.y1*settings.scale, (BOUNDS.x2 - BOUNDS.x1)*settings.scale, (BOUNDS.y2 - BOUNDS.y1)*settings.scale);
                    }

                    // Step 7b: Auto crop image
                    if (settings.autoCrop) {
                        image.autocrop({ leaveBorder: parseInt(settings.autoCrop) || 20, cropOnlyFrames: false });
                    }

                    // Step 8: Make gradient background
                    if (settings.gradientBackground) {
                        let pp, cc, py = -1,
                            c1 = Jimp.intToRGBA(COLORS['background']),
                            c2 = Jimp.intToRGBA(COLORS['background2']);
                        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
                            if (py !== y) {
                                py = y;
                                pp = y / image.bitmap.height;
                                cc = {r: c2.r * pp + c1.r * (1 - pp), g: c2.g * pp + c1.g * (1 - pp), b: c2.b * pp + c1.b * (1 - pp)};
                            }
                            if (image.getPixelColor(x, y) === COLORS['background']) {
                                this.bitmap.data[idx + 0] = cc.r;
                                this.bitmap.data[idx + 1] = cc.g;
                                this.bitmap.data[idx + 2] = cc.b;
                            }
                        });
                    }

                    //return results
                    image.getBuffer(Jimp.AUTO, callback);
                }).catch(err => callback(err));
            } else {
                callback(err);
            }
        });
    }
};

module.exports = Tools;
