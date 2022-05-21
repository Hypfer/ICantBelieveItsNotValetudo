
class Tools {
    /**
     * 
     * @param {Buffer} data
     * @return {boolean}
     */
    static isPNG(data) {
        return data[0] === 0x89 &&
            data[1] === 0x50 &&
            data[2] === 0x4E &&
            data[3] === 0x47 &&
            data[4] === 0x0D &&
            data[5] === 0x0A &&
            data[6] === 0x1A &&
            data[7] === 0x0A;
    }

    /**
     * This has been adapted for this use-case from https://github.com/hughsk/png-chunks-extract/blob/d098d583f3ab3877c1e4613ec9353716f86e2eec/index.js
     *
     * See https://github.com/hughsk/png-chunks-extract/blob/d098d583f3ab3877c1e4613ec9353716f86e2eec/LICENSE.md for more information.
     * 
     * 
     * @param {Buffer} data
     * @return {Buffer}
     */
    static extractZtxtValetudoMapPngChunk(data) {
        // Used for fast-ish conversion between uint8s and uint32s/int32s.
        // Also required in order to remain agnostic for both Node Buffers and
        // Uint8Arrays.
        let uint8 = new Uint8Array(4);
        let uint32 = new Uint32Array(uint8.buffer);
        let ended = false;
        let idx = 8;

        while (idx < data.length) {
            // Read the length of the current chunk,
            // which is stored as a Uint32.
            uint8[3] = data[idx++];
            uint8[2] = data[idx++];
            uint8[1] = data[idx++];
            uint8[0] = data[idx++];

            // Chunk includes name/type for CRC check (see below).
            let length = uint32[0] + 4;
            let chunk = new Uint8Array(length);
            chunk[0] = data[idx++];
            chunk[1] = data[idx++];
            chunk[2] = data[idx++];
            chunk[3] = data[idx++];

            // Get the name in ASCII for identification.
            let name = (
                String.fromCharCode(chunk[0]) +
                String.fromCharCode(chunk[1]) +
                String.fromCharCode(chunk[2]) +
                String.fromCharCode(chunk[3])
            );

            // The IEND header marks the end of the file,
            // so on discovering it break out of the loop.
            if (name === "IEND") {
                ended = true;

                break;
            }

            // Read the contents of the chunk out of the main buffer.
            for (let i = 4; i < length; i++) {
                chunk[i] = data[idx++];
            }

            // Skip the CRC32.
            idx += 4;

            // The chunk data is now copied to remove the 4 preceding
            // bytes used for the chunk name/type.
            let chunkData = new Uint8Array(chunk.buffer.slice(4));

            if (name === "zTXt") {
                let i = 0;
                let keyword = "";

                while (chunkData[i] !== 0 && i < 79) {
                    keyword += String.fromCharCode(chunkData[i]);

                    i++;
                }

                if (keyword !== "ValetudoMap") {
                    continue;
                }

                return Buffer.from(chunkData.slice(i + 2));
            }
        }

        if (!ended) {
            throw new Error(".png file ended prematurely: no IEND header was found");
        }

        throw new Error("No ValetudoMap chunk found in the PNG");
    }

    /**
     * 
     * @param {Buffer} data
     * @return {boolean}
     */
    static isCompressed(data) {
        return data[0x00] === 0x78;
    }
}

module.exports = Tools;
