const Canvas = require('canvas');

const imgRobot = new Canvas.Image();
imgRobot.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent("<svg width=\"32\" height=\"32\" version=\"1.1\" viewBox=\"0 0 32 32\" xmlns=\"http://www.w3.org/2000/svg\"> <ellipse cx=\"16.006\" cy=\"16.006\" rx=\"14.945\" ry=\"14.945\" fill=\"#fff\" stroke=\"#7f7f7f\" stroke-width=\"2.1094\"/> <rect x=\"1.5178\" y=\"12.611\" width=\"28.889\" height=\"2.1094\" fill=\"#7f7f7f\" stroke-width=\"5.5241\"/> <circle cx=\"15.962\" cy=\"13.665\" r=\"4.0931\" fill=\"#fff\" stroke=\"#7f7f7f\" stroke-width=\"1.0547\"/></svg>");


const imgCharger = new Canvas.Image();
imgCharger.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent("<svg width=\"32\" height=\"32\" version=\"1.1\" viewBox=\"0 0 32 32\" xmlns=\"http://www.w3.org/2000/svg\"> <circle cx=\"16.006\" cy=\"16.006\" r=\"14.946\" fill=\"#7f7f7f\" stroke=\"#333\" stroke-width=\"2.1087\"/> <path d=\"m12.95 28.385 8.7632-13.614h-4.6476l2.0375-11.141-8.8115 14.144h4.6754z\" fill=\"#fff\" stroke=\"#0076ff\" stroke-width=\"1.0431\"/></svg>");

class MapDrawer {
    constructor(options) {
        this.settings = Object.assign({
            drawPath: true,
            drawCharger: true,
            drawRobot: true,
            scale: 4,
            rotate: 0
        }, options.settings);

        const defaultColors = {
            floor: "#0076ff",
            obstacle: "#333333",
            path: "#ffffff",
            segments: ["#19A1A1", "#7AC037", "#DF5618", "#F7C841"]
        };
        this.colors = Object.assign(defaultColors,
            options.settings.colors);
        this.colors.floor = this.hexToRgba(this.colors.floor);
        this.colors.obstacle = this.hexToRgba(this.colors.obstacle);
        this.colors.segments = this.colors.segments.map(this.hexToRgba);
    }

    translatePoints(pixels) {
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

    updateMap(mapData) {
        this.bounds = {
            x1: Math.min(...mapData.layers.flatMap(layer => layer.dimensions.x.min)),
            x2: Math.max(...mapData.layers.flatMap(layer => layer.dimensions.x.max)),
            y1: Math.min(...mapData.layers.flatMap(layer => layer.dimensions.y.min)),
            y2: Math.max(...mapData.layers.flatMap(layer => layer.dimensions.y.max))
        };
        this.mapData = { ...mapData, layers: mapData.layers.map(layer => ({ ...layer, pixels: this.translatePoints(layer.pixels) })) };
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
            console.error("Unable to parse hex color " + hex + "!");
            return { r: 0, g: 0, b: 0, a: 255 };
        }
    }

    rotateImage(img, angle) {
        const c = Canvas.createCanvas(img.width, img.height);
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, img.width, img.height);
        ctx.translate(img.width / 2, img.width / 2);
        ctx.rotate(angle * Math.PI / 180);
        ctx.translate(-img.width / 2, -img.width / 2);
        ctx.drawImage(img, 0, 0);
        return c;
    }

    draw(skipLayers) {
        if (!this.mapData || !this.mapData.__class === "ValetudoMap" || !this.mapData.metaData || !this.mapData.metaData.version === 1) {
            console.error("Unable to draw map: no or invalid map data!");
            return;
        }

        let drawLayer = (x, y, r, g, b, a) => {
            for (let yi = 0; yi < this.settings.scale; yi++) {
                const yDelta = (y * this.settings.scale + yi) * this.settings.scale * mapCanvas.width;
                for (let xi = 0; xi < this.settings.scale; xi++) {
                    const xDelta = x * this.settings.scale + xi;
                    const imgLayersOffset = (xDelta + yDelta) * 4;

                    imgLayers.data[imgLayersOffset] = r;
                    imgLayers.data[imgLayersOffset + 1] = g;
                    imgLayers.data[imgLayersOffset + 2] = b;
                    imgLayers.data[imgLayersOffset + 3] = a;
                }
            }
        };

        let drawLines = (points) => {
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
        };

        let drawPath = (points, isPredicted) => {
            const w = canvasWidth * this.settings.scale;
            const h = canvasHeight * this.settings.scale;

            let svgPath = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + w + "\" height=\"" + h + "\" viewBox=\"0 0 " + w + " " + h + "\"><path d=\"";

            for (let i = 0; i < points.length; i += 2) {
                let type = "L";

                if (i === 0) {
                    type = "M";
                }

                svgPath += type + " " + points[i] + " " + points[i + 1] + " ";
            }

            svgPath += "\" fill=\"none\" stroke=\"" + this.colors.path + "\" stroke-width=\"0.5\"";

            if (isPredicted === true) {
                svgPath += " stroke-dasharray=\"1,1\"";
            }

            svgPath += "/></svg>";

            let svgPathImg = new Image();
            svgPathImg.onload = () => {
                ctx.drawImage(svgPathImg, 0, 0);
            };
            svgPathImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgPath);
        };

        let pointsToCanvas = (coords) => coords.map(d => Math.floor(d / this.mapData.pixelSize));

        const canvasWidth = Math.max.apply(undefined, this.mapData.layers.flatMap(l => l.pixels.filter((_, index) => index % 2 === 0))) + 1
        const canvasHeight = Math.max.apply(undefined, this.mapData.layers.flatMap(l => l.pixels.filter((_, index) => index % 2 === 1))) + 1
        const mapCanvas = Canvas.createCanvas(canvasWidth * this.settings.scale, canvasHeight * this.settings.scale);
        let ctx = mapCanvas.getContext("2d");
        if (this.settings.rotate) {
            ctx.rotate(this.settings.rotate * Math.PI / 180);
        }
        ctx.scale(this.settings.scale, this.settings.scale);

        const imgLayers = ctx.createImageData(mapCanvas.width * this.settings.scale, mapCanvas.height * this.settings.scale);

        if ((!skipLayers || !this.lastLayers) && this.mapData.layers && this.mapData.layers.length) {
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
                        color = this.colors.segments[((layer.metaData.segmentId - 1) % this.colors.segments.length)];
                        break;
                }

                for (let i = 0; i < layer.pixels.length; i += 2) {
                    drawLayer(layer.pixels[i], layer.pixels[i + 1], color.r, color.g, color.b, color.a);
                }
            });
            this.lastLayers = imgLayers;
        }
        ctx.putImageData(this.lastLayers, 0, 0);

        const path = this.translatePoints(pointsToCanvas(this.mapData.entities.find(e => e.type === "path").points));
        drawPath(path, false);

        const predictedPath = this.mapData.entities.find(e => e.type === "predicted_path");
        if (predictedPath) {
            predictedPath = this.translatePoints(pointsToCanvas(predictedPath.points));
            drawPath(predictedPath, true);
        }

        const chargerLocation = this.translatePoints(pointsToCanvas(this.mapData.entities.find(e => e.type === "charger_location").points));
        ctx.drawImage(
            imgCharger,
            chargerLocation[0] - (imgCharger.height / this.settings.scale) / 2,
            chargerLocation[1] - (imgCharger.width / this.settings.scale) / 2,
            imgCharger.width / this.settings.scale,
            imgCharger.height / this.settings.scale
        );

        const robotPosition = this.mapData.entities.find(e => e.type === "robot_position");
        const robotPositionPixels = this.translatePoints(pointsToCanvas(robotPosition.points));
        ctx.drawImage(
            this.rotateImage(imgRobot, robotPosition.metaData.angle),
            robotPositionPixels[0] - (imgRobot.width / this.settings.scale) / 2,
            robotPositionPixels[1] - (imgRobot.height / this.settings.scale) / 2,
            imgRobot.width / this.settings.scale,
            imgRobot.height / this.settings.scale
        );

        const virtualWall = this.mapData.entities.find(e => e.type === "virtual_wall");
        if (virtualWall) {
            const virtualWallPath = this.translatePoints(pointsToCanvas(virtualWall.points));
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
            ctx.setLineDash([5, 5]);
            drawLines(virtualWallPath);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        const noGoZone = this.mapData.entities.find(e => e.type === "no_go_area");
        if (noGoZone) {
            const noGoZonePixels = this.translatePoints(pointsToCanvas(noGoZone.points));
            ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
            ctx.fillRect(noGoZonePixels[0], noGoZonePixels[1], noGoZonePixels[2] - noGoZonePixels[0], noGoZonePixels[5] - noGoZonePixels[1]);
        }

        return mapCanvas.toBuffer();
    }
}

module.exports = MapDrawer;