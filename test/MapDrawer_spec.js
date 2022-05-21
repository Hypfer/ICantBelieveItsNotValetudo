const fs = require("fs");
const path = require("path");
const should = require("should");

const MapDrawer = require("../lib/MapDrawer");

should.config.checkProtoEql = false;

describe("MapDrawer", function () {
    let mapDrawer;
    beforeEach(async function () {
        mapDrawer = new MapDrawer({settings:{}});
    });

    it("Should draw old uncompressed format map", async function() {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, "/res/testmap_old_format.json")).toString());
        const expected = fs.readFileSync(path.join(__dirname, "/res/testmap_old_format.png"));

        mapDrawer.updateMap(data);

        const actual = mapDrawer.draw();
        Buffer.from(actual.img).should.deepEqual(expected);
    });

    it("Should draw new compressed format map", async function() {
        const data = JSON.parse(fs.readFileSync(path.join(__dirname, "/res/d9_1093_huge.json")).toString());
        const expected = fs.readFileSync(path.join(__dirname, "/res/d9_1093_huge.png"));

        mapDrawer.updateMap(data);

        const actual = mapDrawer.draw();
        Buffer.from(actual.img).should.deepEqual(expected);
    });
});
