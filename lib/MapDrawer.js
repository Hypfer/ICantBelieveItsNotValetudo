const Canvas = require("canvas");

const Logger = require("./Logger");

const imgRobot = new Canvas.Image();
imgRobot.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAh1BMVEVHcEyAgICAgIB/f39/f39/f39/f395eXl/f39+fn6AgICAgICAgIB+fn6AgICAgICAgIB9fX17e3t/f39/f3////+jo6PMzMz+/v6Hh4eLi4vd3d3r6+vv7+/S0tKxsbGSkpLV1dWampqdnZ35+fnj4+Pu7u6VlZXm5ua7u7vFxcWrq6v29vYo4VgOAAAAFHRSTlMA+Zbkx+pHBvMYypSDLH/imC8bkwClvk4AAAFbSURBVDjLjVPpmoIwDCxQLsVjdwe0wEIFqaC+//Nt5SjlWD/nZ5Im00mGEAXXMTe2Ydgb03HJEv7Rg4Jn+rO0G8h0nGe1EHWWx7IkmHTxKVAk57DHOSkAqjX5ssAuKt2WZAzWTr23wNNwBnGD9d3Pp+DPcIEnB+14BGBpuIKUIWgHeLiEq8jgvYgeUSh+SRTHj1oxLWBKBh6SIXJid5HemWqYwHOJg3hoIFj7OGED5XMMR04oTz2ivItHjyFSYks24wbYqStoxhAosVFGPXjTFeR8iJSwiQGhOMXX1+DnKIuAoReEj/JX6nNrQr3ARj2uqGE3zu7j2io5giLTxLtW1XWiJSUm8smeJ2Ln8puaUAu0QulSz/Ot1HJG8U8Luaxtt+7s7brfHcz+s5Mj/mHlaFMOSx3+Tp59tjj7w+5z40ge+856lRBVZ7393MC+qZt366/4e7A//dHt/we57EXVTFli0wAAAABJRU5ErkJggg==";

const imgCharger = new Canvas.Image();
imgCharger.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAA3lBMVEVHcEwzMzMzMzMzMzMzMzMzMzMzMzMzMzMvLy81NTUzMzMzMzMyMjIzMzMwMDAzMzMyMjIzMzM0NDQxMTF/f38zMzP///90dHRlZWV+fn44ODg+Pj5CQkIDd/5vb28Nevl6f4RzfowqgeVRUVFHe7h6enpZfKZra2s7fckYgfpqamotftw6Ojqs0v9jfZ1dfKFTfa0bffC82/8VfPRofZaQxP9QUFAffel1tP3x9//H4f8ujPljqv09lPn7/f+cyv8OfPtrfZNPnvpGmvokh/tbfKPZ6//n8v/k8P8zftXx8ykfAAAAFHRSTlMA6vn08eNGyAYYlpSDfxotmJUsL9z/XeQAAAG5SURBVDjLbVNpY4IwDEVFTs+tKYcionhfk3nO+5jb/v8fWlFoK1u+0JA2eUneEwRqiqTJqXQ6JZclRfhrhZII1ERNTYSVXAZg2DRrhlEzmzZAJveURZUBqh0L3e1tbHWqADKX5DULthmFkef6CFmmDdkifZ+FioFiGzif4ceoQLYQ1Zeh0qLxds/x7odWBeQHjhzY7H39fe5GR8OG/L2/DJg0jrrnUSM+m5AJgZagatH47Pi96saOVQWNIBChwxIs5/jyRr0+iIoggc0S+Js97s2oaw1BEjRo0h/e8QOvnTpLuABdkBlEa7DCOJiyOIEpCymosRGsMZ67DWLtx58apIQ0GHQEI4zxLQiC7TQqY0Cau9C94Id9HceIXaAlZs5mt9sdyIUznURYgoI8TYgtSZXRe50HWebaRMi94XWv/dSmBEMW95w93v4w3yaDehr1ZIMD13seNRklW5a/3V/ZKsiy9JBP3LoHh9WAn6OoJggzPXAFYsJwlKs7V5/GGeUYacfOkr0npKXEL0a0951TjC+k/UtCOH1rHHfQTwiH4Mhz0luE0ssnBaxqvHh19R99K5L+kL/Oy/8XPUNO3QXBtp4AAAAASUVORK5CYII=";

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
            Logger.error("Unable to parse hex color " + hex + "!");
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
        if (!this.mapData || this.mapData.__class !== "ValetudoMap" || !this.mapData.metaData) {
            Logger.error("Unable to draw map: no or invalid map data!");
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

        let pointsToCanvas = (coords) => coords.map(d => Math.floor(d / this.mapData.pixelSize));

        const canvasWidth = Math.max.apply(undefined, this.mapData.layers.flatMap(l => l.pixels.filter((_, index) => index % 2 === 0))) + 1;
        const canvasHeight = Math.max.apply(undefined, this.mapData.layers.flatMap(l => l.pixels.filter((_, index) => index % 2 === 1))) + 1;
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

        const pathEntity = this.mapData.entities.find(e => e.type === "path");
        if (pathEntity) {
            const path = this.translatePoints(pointsToCanvas(pathEntity.points));
            ctx.beginPath();
            ctx.strokeStyle = this.colors.path;
            drawLines(path);
            ctx.stroke();
        }


        const predictedPathEntity = this.mapData.entities.find(e => e.type === "predicted_path");
        if (predictedPathEntity) {
            const predictedPath = this.translatePoints(pointsToCanvas(predictedPathEntity.points));
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            drawLines(predictedPath);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        const chargerLocationEntity = this.mapData.entities.find(e => e.type === "charger_location");
        if (chargerLocationEntity) {
            const chargerLocation = this.translatePoints(pointsToCanvas(chargerLocationEntity.points));
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
            const robotPosition = this.translatePoints(pointsToCanvas(robotPositionEntity.points));
            ctx.drawImage(
                this.rotateImage(imgRobot, robotPositionEntity.metaData.angle),
                robotPosition[0] - (imgRobot.width / this.settings.scale) / 2,
                robotPosition[1] - (imgRobot.height / this.settings.scale) / 2,
                imgRobot.width / this.settings.scale,
                imgRobot.height / this.settings.scale
            );
        }


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

        const img = mapCanvas.toBuffer();
        const base64 = mapCanvas.toDataURL();

        return {img, base64};
    }
}

module.exports = MapDrawer;
