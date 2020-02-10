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
            underlay_y: 0
        }, options.settings);
        
        // parse colors
        const defaultColors = {
            floor: "#0076ff",
            obstacle_weak: "#6699ff",
            obstacle_strong: "#52aeff",
            path: "#ffffff"
        }
        const confColors = Object.assign(defaultColors,
            options.settings.colors);
        const colors = {
            floor: Jimp.cssColorToHex(confColors.floor),
            obstacle_weak: Jimp.cssColorToHex(confColors.obstacle_weak),
            obstacle_strong: Jimp.cssColorToHex(confColors.obstacle_strong),
            path: Jimp.cssColorToHex(confColors.path)
        };

        const BOUNDS = {
            x1: Math.min(settings.crop_x1, options.parsedMapData.image.dimensions.width-1),
            x2: Math.min(settings.crop_x2, options.parsedMapData.image.dimensions.width),
            y1: Math.min(settings.crop_y1, options.parsedMapData.image.dimensions.height-1),
            y2: Math.min(settings.crop_y2, options.parsedMapData.image.dimensions.height),
        }

        new Jimp(BOUNDS.x2-BOUNDS.x1, BOUNDS.y2-BOUNDS.y1, function (err, image) {
            if (!err) {
                //Step 1: Draw Map + calculate viewport
                Object.keys(options.parsedMapData.image.pixels).forEach(key => {
                    const color = colors[key];

                    options.parsedMapData.image.pixels[key].forEach(function drawPixel(px) {
                        if(px[0]>= BOUNDS.x1 && px[0]<= BOUNDS.x2 && px[1]>= BOUNDS.y1 && px[1]<= BOUNDS.y2 ){
                            image.setPixelColor(color, px[0]-BOUNDS.x1, px[1]-BOUNDS.y1);
                        }
                    })
                });

                //Step 2: Scale
                image.scale(settings.scale, Jimp.RESIZE_NEAREST_NEIGHBOR);

                //Step 3: Draw Path
                const coords = options.parsedMapData.path.points.map(point => {
                    return [
                        Math.floor((point[0]/50 - options.parsedMapData.image.position.left - BOUNDS.x1) * settings.scale),
                        Math.floor((point[1]/50 - options.parsedMapData.image.position.top - BOUNDS.y1) * settings.scale)
                    ]});
                let first = true;
                let oldPathX, oldPathY; // old Coordinates
                let dx, dy; //delta x and y
                let step, x, y, i;
                coords.forEach(function (coord) {
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

                Jimp.read(chargerImagePath, function (err, chargerImage) {
                    if (!err) {
                        Jimp.read(robotImagePath, function (err, robotImage) {
                            if (!err) {
                                //Step 6: Draw Charger
                                if (settings.drawCharger === true && options.parsedMapData.charger) {
                                    const chargerCoords = {
                                        x: options.parsedMapData.charger[0] / 50 - options.parsedMapData.image.position.left - BOUNDS.x1,
                                        y: options.parsedMapData.charger[1] / 50 - options.parsedMapData.image.position.top - BOUNDS.y1
                                    };

                                    image.composite(
                                        chargerImage,
                                        chargerCoords.x * settings.scale - chargerImage.bitmap.width / 2,
                                        chargerCoords.y * settings.scale - chargerImage.bitmap.height / 2
                                    );
                                }

                                //Step 7: Draw Robot
                                if (settings.drawRobot === true && options.parsedMapData.robot) {
                                    const robotCoords = {
                                        x: options.parsedMapData.robot[0] / 50 - options.parsedMapData.image.position.left - BOUNDS.x1,
                                        y: options.parsedMapData.robot[1] / 50 - options.parsedMapData.image.position.top - BOUNDS.y1
                                    };

                                    image.composite(
                                        robotImage.rotate(-1 * options.parsedMapData.path.current_angle-90),
                                        robotCoords.x * settings.scale - robotImage.bitmap.width / 2,
                                        robotCoords.y * settings.scale - robotImage.bitmap.height / 2
                                    )
                                }
                                

                                image.getBuffer(Jimp.AUTO, callback);
                            } else {
                                callback(err);
                            }
                        })
                    } else {
                        callback(err);
                    }
                });
                
                // Step 8: Load, scale and draw overlay image
                if (settings.overlay_path) {
                    Jimp.read(settings.overlay_path, function (err, overlayImage) {
                        if (!err) {
                            overlayImage.scale(settings.overlay_scale, Jimp.AUTO);
                            image.composite(overlayImage, settings.overlay_x, settings.overlay_y);
                        }
                    });
                }
                
                // Step 9: Load, scale and draw underlay image
                if (settings.underlay_path) {
                    Jimp.read(settings.underlay_path, function (err, underlayImage) {
                        if (!err) {
                            underlayImage.scale(settings.underlay_scale, Jimp.AUTO);
                            image.composite(underlayImage, settings.underlay_x, settings.underlay_y, {
                                mode: Jimp.BLEND_DESTINATION_OVER
                                });
                        }
                    });
                }
                
                
            } else {
                callback(err);
            }
        });
    }
};

module.exports = Tools;
