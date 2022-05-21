const Canvas = require("@napi-rs/canvas");
const fs = require("fs");
const path = require("path");

const FourColorTheoremSolver = require("./FourColorTheoremSolver");
const Logger = require("./Logger");

const imgRobot = new Canvas.Image();
imgRobot.src = fs.readFileSync(path.join(__dirname, "./res/robot.png"));

const imgCharger = new Canvas.Image();
imgCharger.src = fs.readFileSync(path.join(__dirname, "./res/charger.png"));


class MapDrawer {
    constructor(options) {
        this.settings = Object.assign({
            drawPath: true,
            drawCharger: true,
            drawRobot: true,
            scale: 4,
            rotate: 0,
            crop_left: 0,
            crop_top: 0,
            crop_right: 0,
            crop_bottom: 0,
            padding_left: 0,
            padding_top: 0,
            padding_right: 0,
            padding_bottom: 0,
        }, options.settings);

        const defaultColors = {
            floor: "#0076ff",
            obstacle: "#333333",
            path: "#ffffff",
            segments: ["#19A1A1", "#7AC037", "#DF5618", "#F7C841"]
        };
        this.colors = Object.assign(defaultColors, options.settings.colors);
        this.colors.floor = this.hexToRgba(this.colors.floor);
        this.colors.obstacle = this.hexToRgba(this.colors.obstacle);
        this.colors.segments = this.colors.segments.map(this.hexToRgba);
    }

    updateMap(mapData) {
        if (mapData.metaData?.version === 2 && Array.isArray(mapData.layers)) {
            mapData.layers.forEach(layer => {
                if (layer.pixels.length === 0 && layer.compressedPixels.length !== 0) {
                    for (let i = 0; i < layer.compressedPixels.length; i = i + 3) {
                        const xStart = layer.compressedPixels[i];
                        const y = layer.compressedPixels[i+1];
                        const count = layer.compressedPixels[i+2];

                        for (let j = 0; j < count; j++) {
                            layer.pixels.push(
                                xStart + j,
                                y
                            );
                        }
                    }
                }
            });
        }


        this.bounds = {
            x1: Math.min(...mapData.layers.flatMap(layer => layer.dimensions.x.min)),
            x2: Math.max(...mapData.layers.flatMap(layer => layer.dimensions.x.max)),
            y1: Math.min(...mapData.layers.flatMap(layer => layer.dimensions.y.min)),
            y2: Math.max(...mapData.layers.flatMap(layer => layer.dimensions.y.max))
        };

        this.mapData = { ...mapData, layers: mapData.layers.map(layer => ({ ...layer, pixels: this.translatePixels(layer.pixels) })) };
    }

    hexToRgba(hex) {
        try {
            return {
                r: parseInt(hex.slice(1, 3), 16),
                g: parseInt(hex.slice(3, 5), 16),
                b: parseInt(hex.slice(5, 7), 16),
                a: hex.length >= 9 ? parseInt(hex.slice(7, 9), 16) : 255
            };
        } catch {
            Logger.error("Unable to parse hex color " + hex + "!");
            return { r: 0, g: 0, b: 0, a: 255 };
        }
    }

    rotateImage(img, angle) {
        const outImg = new Canvas.Image();
        const c = Canvas.createCanvas(img.width, img.height);
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, img.width, img.height);
        ctx.translate(img.width / 2, img.width / 2);
        ctx.rotate(angle * Math.PI / 180);
        ctx.translate(-img.width / 2, -img.width / 2);
        ctx.drawImage(img, 0, 0);

        outImg.src = c.encodeSync("png");
        return outImg;
    }

    cropAndPadCanvas (sourceCanvas,sx,sy,cropWidth,cropHeight,dx, dy, finalWidth, finalHeight) {
        let destCanvas = Canvas.createCanvas(finalWidth, finalHeight);
        destCanvas.getContext("2d").drawImage(
            sourceCanvas,
            sx,sy,cropWidth,cropHeight,
            dx,dy,cropWidth,cropHeight);
        return destCanvas;
    }

    draw() {
        if (!this.mapData || this.mapData.__class !== "ValetudoMap" || !this.mapData.metaData) {
            Logger.error("Unable to draw map: no or invalid map data!");
            return;
        }

        const canvasWidth = Math.max.apply(undefined, this.mapData.layers.flatMap(l => l.pixels.filter((_, index) => index % 2 === 0))) + 1;
        const canvasHeight = Math.max.apply(undefined, this.mapData.layers.flatMap(l => l.pixels.filter((_, index) => index % 2 === 1))) + 1;

        const scaledCanvasWidth = canvasWidth * this.settings.scale;
        const scaledCanvasHeight = canvasHeight * this.settings.scale;

        const mapCanvas = Canvas.createCanvas(scaledCanvasWidth, scaledCanvasHeight);
        const ctx = mapCanvas.getContext("2d");

        if (this.settings.rotate) {
            ctx.rotate(this.settings.rotate * Math.PI / 180);
        }

        ctx.scale(this.settings.scale, this.settings.scale);

        this.drawLayers(ctx, scaledCanvasWidth, scaledCanvasHeight);
        this.drawEntities(ctx);

        let rawImg;
        let base64Img;


        if (this.settings.crop_left === 0 && this.settings.crop_top === 0 && this.settings.crop_bottom === 0 && this.settings.crop_right === 0){
            rawImg = mapCanvas.toBuffer("image/png");
            base64Img = mapCanvas.toDataURL();
        } else {
            const cropWidth = mapCanvas.width - this.settings.crop_left - this.settings.crop_right;
            const cropHeight = mapCanvas.height - this.settings.crop_top - this.settings.crop_bottom;

            const finalWidth = cropWidth + this.settings.padding_right + this.settings.padding_left;
            const finalHeight = cropHeight + this.settings.padding_top + this.settings.padding_bottom;

            const croppedMapCanvas = this.cropAndPadCanvas(mapCanvas, this.settings.crop_left, this.settings.crop_top, cropWidth, cropHeight, this.settings.padding_left, this.settings.padding_top, finalWidth, finalHeight);

            rawImg = croppedMapCanvas.toBuffer("image/png");
            base64Img = croppedMapCanvas.toDataURL();
        }


        return {
            img: rawImg,
            base64: base64Img
        };
    }


    drawEntities(ctx) {
        this.mapData.entities.filter(e => e.type === "path").forEach(
            pathEntity =>{
                const path = this.translatePixels(this.translateCoordinatesToPixels(pathEntity.points));
                ctx.beginPath();
                ctx.strokeStyle = this.colors.path;
                this.drawLines(ctx, path);
                ctx.stroke();
            });


        const predictedPathEntity = this.mapData.entities.find(e => e.type === "predicted_path");
        if (predictedPathEntity) {
            const predictedPath = this.translatePixels(this.translateCoordinatesToPixels(predictedPathEntity.points));
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            this.drawLines(ctx, predictedPath);
            ctx.stroke();
            ctx.setLineDash([]);
        }


        const chargerLocationEntity = this.mapData.entities.find(e => e.type === "charger_location");
        if (chargerLocationEntity) {
            const chargerLocation = this.translatePixels(this.translateCoordinatesToPixels(chargerLocationEntity.points));
            ctx.drawImage(
                imgCharger,
                chargerLocation[0] - (imgCharger.height / this.settings.scale) / 2,
                chargerLocation[1] - (imgCharger.width / this.settings.scale) / 2,
                imgCharger.width / this.settings.scale,
                imgCharger.height / this.settings.scale
            );
        }


        const robotPositionEntity = this.mapData.entities.find(e => e.type === "robot_position");
        if (robotPositionEntity) {
            const robotPosition = this.translatePixels(this.translateCoordinatesToPixels(robotPositionEntity.points));
            ctx.drawImage(
                this.rotateImage(imgRobot, robotPositionEntity.metaData.angle),
                robotPosition[0] - (imgRobot.width / this.settings.scale) / 2,
                robotPosition[1] - (imgRobot.height / this.settings.scale) / 2,
                imgRobot.width / this.settings.scale,
                imgRobot.height / this.settings.scale
            );
        }


        this.mapData.entities.filter(e => e.type === "virtual_wall").forEach(virtualWall => {
            const virtualWallPath = this.translatePixels(this.translateCoordinatesToPixels(virtualWall.points));
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
            ctx.setLineDash([5, 5]);
            this.drawLines(ctx, virtualWallPath);
            ctx.stroke();
            ctx.setLineDash([]);
        });

        this.mapData.entities.filter(e => e.type === "no_go_area").forEach(noGoZone => {
            const noGoZonePixels = this.translatePixels(this.translateCoordinatesToPixels(noGoZone.points));
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.fillRect(noGoZonePixels[0], noGoZonePixels[1], noGoZonePixels[2] - noGoZonePixels[0], noGoZonePixels[5] - noGoZonePixels[1]);
        });
    }

    drawLayers(ctx, scaledCanvasWidth, scaledCanvasHeight) {
        const layerImageData = new Canvas.ImageData(
            new Uint8ClampedArray( scaledCanvasWidth * scaledCanvasHeight * 4 ),
            scaledCanvasWidth,
            scaledCanvasHeight
        );

        if (this.mapData.layers && this.mapData.layers.length) {
            const colorFinder = new FourColorTheoremSolver(this.mapData.layers, this.mapData.pixelSize);

            this.mapData.layers.forEach(layer => {
                let color = { r: 0, g: 0, b: 0, a: 255 };

                switch (layer.type) {
                    case "floor":
                        color = this.colors.floor;
                        break;
                    case "wall":
                        color = this.colors.obstacle;
                        break;
                    case "segment":
                        color = this.colors.segments[colorFinder.getColor((layer.metaData.segmentId ?? ""))];
                        break;
                }

                for (let i = 0; i < layer.pixels.length; i += 2) {
                    const x = layer.pixels[i];
                    const y = layer.pixels[i + 1];


                    for (let yi = 0; yi < this.settings.scale; yi++) {
                        const yDelta = (y * this.settings.scale + yi) * scaledCanvasWidth;

                        for (let xi = 0; xi < this.settings.scale; xi++) {
                            const xDelta = x * this.settings.scale + xi;
                            const imgLayersOffset = (xDelta + yDelta) * 4;

                            layerImageData.data[imgLayersOffset] = color.r;
                            layerImageData.data[imgLayersOffset + 1] = color.g;
                            layerImageData.data[imgLayersOffset + 2] = color.b;
                            layerImageData.data[imgLayersOffset + 3] = color.a;
                        }
                    }
                }
            });
        }

        ctx.putImageData(layerImageData, 0, 0);
    }

    drawLines(ctx, points) {
        let first = true;

        for (let i = 0; i < points.length; i += 2) {
            const [x, y] = ([points[i], points[i + 1]]);
            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
    }

    /**
     *
     * @param {Array<number>} coords
     * @return {Array<number>}
     */
    translateCoordinatesToPixels(coords) {
        return coords.map(d => Math.round(d / this.mapData.pixelSize));
    }

    /**
     * As most of the time, around 80% of the coordinate space are completely empty, we crop the data that should
     * be rendered to the area where there actually is some map data
     *
     * @param {Array<number>} pixels
     * @return {Array<number>}
     */
    translatePixels(pixels) {
        const arr = [];
        for (let i = 0; i < pixels.length; i += 2) {
            const x = pixels[i];
            const y = pixels[i + 1];

            if (x >= this.bounds.x1 && x <= this.bounds.x2 && y >= this.bounds.y1 && y <= this.bounds.y2) {
                arr.push(x - this.bounds.x1, y - this.bounds.y1);
            }
        }
        return arr;
    }
}

module.exports = MapDrawer;
