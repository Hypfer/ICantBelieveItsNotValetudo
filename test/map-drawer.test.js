const {describe, it, beforeEach} = require("mocha");
const MapDrawer = require('./../lib/MapDrawer');
const {expect} = require('chai');

describe('MapDrawer', function () {

    let mapDrawer;

    beforeEach(() => {
        mapDrawer = new MapDrawer({settings: {}})
    })

    describe('cropMapPixels', function () {
        it('should not crop used pixels', function () {
            expect(mapDrawer.cropMapPixels([1, 1], {x1: 0, x2: 111, y1: 0, y2: 111}), [1, 1]);
        });

        it('should crop unused pixels', function () {
            expect(mapDrawer.cropMapPixels([100, 100], {x1: 0, x2: 111, y1: 0, y2: 111}), [1, 1]);
        });
    });


    describe('mapBounds', function () {
        let data;
        beforeEach(() => {
            data = {
                layers: [{
                    dimensions: {
                        x: {
                            min: 10,
                            max: 50,
                        },
                        y: {
                            min: 20,
                            max: 40,
                        }
                    }
                }, {
                    dimensions: {
                        x: {
                            min: 11,
                            max: 55,
                        },
                        y: {
                            min: 22,
                            max: 44,
                        }
                    }
                }
                ]
            }
        })

        it('should find bounds dimensions', function () {
            expect(mapDrawer.mapBounds(data), {x1: 10, x2: 55, y1: 20, y2: 44});
        });
    });


});
