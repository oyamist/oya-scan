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

    it("TESTTESTdefault ctor", () => {
        var scanner = new Scanner();
        should(scanner).instanceOf(Scanner);
        should.deepEqual(scanner.map, {});
        should(scanner).properties({
            tag: Scanner.TAG_SCANNED,
        });

        // floating point number
        should(scanner.scan("1")).properties({
            tag: 'number',
            value: 1,
        });
        should(scanner.scan("42")).properties({
            tag: 'number',
            value: 42,
        });
        should(scanner.scan("123.456")).properties({
            tag: 'number',
            value: 123.456,
        });
        should(scanner.scan("-123.456")).properties({
            tag: 'number',
            value: -123.456,
        });

        // not a number
        should(scanner.scan("123,456")).properties({
            tag: 'scanned',
            value: '123,456',
        });
        should(scanner.scan("123.456.789")).properties({
            tag: 'scanned',
            value: '123.456.789',
        });
        should(scanner.scan("+1")).properties({
            tag: 'scanned',
            value: '+1',
        });
        should(scanner.scan("1a1")).properties({
            tag: 'scanned',
            value: '1a1',
        });

    });
    it("TESTTESTcustom ctor",() => {
        var map = TESTMAP;
        var tag = 'barcode'; // new default tag
        var PAT_INT = '[0-9]+';
        var patterns = [{
            re: PAT_INT,
            value: 'number', // integers
        }];
        var scanner = new Scanner({
            map,
            tag,
            patterns,
        });
        should.deepEqual(scanner.map, TESTMAP);
        should(scanner).properties({
            tag,
            map,
        });
        should.deepEqual(scanner.patterns, [{
            re: new RegExp(`^${PAT_INT}$`),
            value: 'number',
        }]);

        should(scanner.scan("123")).properties({
            tag: 'number',
            value: 123,
        });
        should(scanner.scan("123.456")).properties({
            tag: 'barcode',
            value: '123.456',
        });
    });
    it("scan(data) returns mapped Observation (Object)", () => {
        var scanner = new Scanner({
            map: TESTMAP,
        });

        // raw data
        var datain = "hello";
        var dataout = scanner.scan(datain);
        should(dataout).instanceOf(Observation);
        should(Date.now() - dataout.t).above(-1).below(5);
        should(dataout.value).equal(datain);
        should(dataout.tag).equal(scanner.tag);

        // mapped data
        var dataout = scanner.scan("a0001");
        should(Date.now() - dataout.t).above(-1).below(5);
        should(dataout.value).equal('red');
        should(dataout.tag).equal('color');

        // mapped keys are trimmed
        var dataout = scanner.scan(" a0003\n  \n");
        should(dataout.t - Date.now()).above(-1).below(5);
        should(dataout.value).equal(5);
        should(dataout.tag).equal('height');
    });
    it("scan(data) returns mapped Observation (function)", () => {
        var mapper = {
            map: (barcode)=>{
                return {
                    "a0001": {
                        "tag": "color",
                        "value": "red"
                    },
                    "a0002": {
                        "tag": "color",
                        "value": "blue"
                    }
                }[barcode];
            },
        };
        var scanner = new Scanner({
            map: mapper,
        });

        // raw data
        var datain = "hello";
        var dataout = scanner.scan(datain);
        should(dataout).instanceOf(Observation);
        should(Date.now() - dataout.t).above(-1).below(5);
        should(dataout.value).equal(datain);
        should(dataout.tag).equal(scanner.tag);

        // mapped data
        var dataout = scanner.scan("a0001");
        should(Date.now() - dataout.t).above(-1).below(5);
        should(dataout.value).equal('red');
        should(dataout.tag).equal('color');
    });
    it("TESTTESTscan(data) returns number", () => {
        var scanner = new Scanner();
        var ob1 = scanner.scan("123.456");
        should(ob1).instanceOf(Observation);
        should(ob1).properties({
            tag: Scanner.TAG_NUMBER,
            value: 123.456,
        })

        // custom number
        var patterns = [{
            re: '[0-9]+',
            value: 'number',
        }];
        var scanner = new Scanner({
            patterns,
        });
        var ob1 = scanner.scan("123.456");
        should(ob1).instanceOf(Observation);
        should(ob1).properties({
            tag: Scanner.TAG_SCANNED,
            value: "123.456",
        })
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
