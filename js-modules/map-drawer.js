const { createCanvas, createImageData, loadImage } = require('canvas');

/**
 * Object for drawing the map itself onto a 1024 * 1024 canvas.
 * It's not displayed directly but used to easily paint the map image onto another canvas.
 * @constructor
 */
module.exports = function MapDrawer(colors) {

    function hexToRgba(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(hex.trim());

        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            a: result[4] ? parseInt(result[4], 16) : 255
        } : null;
    }

    /**
     *
     * @param {Array<object>} layers - the data containing the map image (array of pixel offsets)
     * @param {Number} scale
     */
    function draw(layers, scale) {
        const canvasWidth = Math.max.apply(undefined, layers.flatMap(l => l.pixels.filter((_, index) => index % 2 === 0))) + 1
        const canvasHeight = Math.max.apply(undefined, layers.flatMap(l => l.pixels.filter((_, index) => index % 2 === 1))) + 1

        const mapCanvas = createCanvas(canvasWidth * scale, canvasHeight * scale);
        const mapCtx = mapCanvas.getContext("2d");

        const freeColor = hexToRgba(colors.floor);
        const occupiedColor = hexToRgba(colors.obstacle_strong);
        const segmentColors = colors.segments.map(hexToRgba);

        mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
        const imgData = mapCtx.createImageData(mapCanvas.width * scale, mapCanvas.height * scale);

        if (layers && layers.length > 0) {
            mapCtx.scale(scale, scale)
            layers.forEach(layer => {
                let color;

                switch (layer.type) {
                    case "floor":
                        color = freeColor;
                        break;
                    case "wall":
                        color = occupiedColor;
                        break;
                    case "segment":
                        color = segmentColors[((layer.metaData.segmentId - 1) % segmentColors.length)];
                        break;
                }

                if (!color) {
                    console.error("Missing color for " + layer.type);
                    color = {r: 0, g: 0, b: 0, a: 255};
                }

                for (let i = 0; i < layer.pixels.length; i = i + 2) {
                    drawPixel(imgData, scale, mapCanvas.width, layer.pixels[i], layer.pixels[i + 1], color.r, color.g, color.b, color.a);
                }
            });
        }

        mapCtx.putImageData(imgData, 0, 0);

        return mapCanvas
    }

    /**
     * @param {ImageData} imgData
     * @param {Number} scale
     * @param {Number} mapCanvasWidth
     * @param {Number} x
     * @param {Number} y
     * @param {Number} r
     * @param {Number} g
     * @param {Number} b
     * @param {Number} a
     */
    function drawPixel(imgData, scale, mapCanvasWidth, x, y, r, g, b, a) {
        for (let yi = 0; yi < scale; yi++) {
            let yDelta = (y * scale + yi) * scale * mapCanvasWidth;
            for (let xi = 0; xi < scale; xi++) {
                let xDelta = x * scale + xi;
                let imgDataOffset = (xDelta + yDelta) * 4;

                imgData.data[imgDataOffset] = r;
                imgData.data[imgDataOffset + 1] = g;
                imgData.data[imgDataOffset + 2] = b;
                imgData.data[imgDataOffset + 3] = a;
            }
        }
    }

    return {
        draw: draw
    };
}
