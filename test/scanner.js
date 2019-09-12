(typeof describe === 'function') && describe("scanner", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const { logger } = require('rest-bundle');
    const {
        Readable,
        Writable,
    } = require('stream');
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

    it("default ctor", () => {
        var scanner = new Scanner();
        should(scanner).instanceOf(Scanner);
        should.deepEqual(scanner.map, {});
        should(scanner).properties({
            tag: 'scanned',
        });
    });
    it("custom ctor",() => {
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
    it("scan(data) returns mapped Observation", () => {
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
    it("transform(is,os) transforms input to output stream", (done) => {
        (async function() { try {
            var scanner = new Scanner({
                map: TESTMAP,
            });
            var ispath = path.join(__dirname, 'data', 'a0001.txt');
            var is = fs.createReadStream(ispath);
            var ospath = tmp.tmpNameSync();
            var os = fs.createWriteStream(ospath);;

            // transform returns a Promise
            var result = await scanner.transform(is, os);

            should(result).properties(['started', 'ended']);
            should(result).properties({
                bytes: 24,
                observations: 4,
            });
            should(result.started).instanceOf(Date);
            should(result.ended).instanceOf(Date);

            // output stream has one observation per line
            should(fs.existsSync(ospath));
            var odata = fs.readFileSync(ospath).toString();
            var ojs = odata.trim().split('\n').map(line => line && JSON.parse(line));
            should(ojs[0]).properties({ // a001
                tag: 'color',
                value: 'red',
            });
            should(ojs[1]).properties({ // a002
                tag: 'color',
                value: 'blue',
            });
            should(ojs[2]).properties({ // a003
                tag: 'height',
                value: 5,
            });
            should(ojs[3]).properties({ // a004
                tag: 'height',
                value: 10,
            });
            should(ojs.length).equal(4); 
            done();
        } catch(e) {done(e)} })();
    });


})
