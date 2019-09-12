(typeof describe === 'function') && describe("scanner", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const { logger } = require('rest-bundle');
    const {
        Observation,
        Scanner,
    } = require('../index');
    const TESTMAP = {
        a0001: {
            value: 'red',
            tag: 'color',
        },
        a0002: {
            value: 'blue',
            tag: 'color',
        },
        a0003: {
            value: 5,
            tag: 'height',
        },
        a0004: {
            value: 10,
            tag: 'height',
        },
    };

    it("TESTTESTdefault ctor", () => {
        var scanner = new Scanner();
        should(scanner).instanceOf(Scanner);
        should.deepEqual(scanner.map, {});
        should(scanner).properties({
            tag: 'scanned',
        });
    });
    it("TESTTESTcustom ctor",() => {
        var map = TESTMAP;
        var tag = 'barcode';
        var scanner = new Scanner({
            map,
            tag,
        });
        should.deepEqual(scanner.map, TESTMAP);
        should(scanner).properties({
            tag,
        });
    });
    it("TESTTESTscan(data) returns mapped Observation", () => {
        var scanner = new Scanner({
            map: TESTMAP,
        });

        // raw data
        var datain = "hello";
        var dataout = scanner.scan(datain);
        should(dataout).instanceOf(Observation);
        should(Date.now() - dataout.t).above(-1).below(1);
        should(dataout.value).equal(datain);
        should(dataout.tag).equal(scanner.tag);

        // mapped data
        var dataout = scanner.scan("a0001");
        should(Date.now() - dataout.t).above(-1).below(1);
        should(dataout.value).equal('red');
        should(dataout.tag).equal('color');

        // mapped keys are trimmed
        var dataout = scanner.scan(" a0003\n  \n");
        should(dataout.t - Date.now()).above(-1).below(1);
        should(dataout.value).equal(5);
        should(dataout.tag).equal('height');
    });
})
