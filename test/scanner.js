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
            tag: Scanner.TAG_SCANNED,
        });

        // floating point number
        var ob = scanner.scan('1');
        should.deepEqual(ob, new Observation("number", 1, ob.t));
        var ob = scanner.scan('42');
        should.deepEqual(ob, new Observation("number", 42, ob.t));
        var ob = scanner.scan('123.456');
        should.deepEqual(ob, new Observation("number", 123.456, ob.t));
        var ob = scanner.scan('-123.456');
        should.deepEqual(ob, new Observation("number", -123.456, ob.t));

        // not a number
        var ob = scanner.scan('123,456');
        should.deepEqual(ob, new Observation("scanned", '123,456', ob.t));
        var ob = scanner.scan('123.456.789');
        should.deepEqual(ob, new Observation("scanned", '123.456.789', ob.t));
        var ob = scanner.scan('+1');
        should.deepEqual(ob, new Observation("scanned", '+1', ob.t));
        var ob = scanner.scan('1a1');
        should.deepEqual(ob, new Observation("scanned", '1a1', ob.t));
    });
    it("custom ctor",() => {
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

        var ob = scanner.scan('123');
        should.deepEqual(ob, new Observation('number', 123, ob.t));
        var ob = scanner.scan('123.456');
        should.deepEqual(ob, new Observation('barcode', "123.456", ob.t));
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
        should(Date.now() - dataout.t).above(-1).below(5);
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
    it("scan(data) returns number", () => {
        var scanner = new Scanner();

        // default number pattern
        var ob = scanner.scan("123.456");
        should.deepEqual(ob, new Observation("number", 123.456, ob.t));

        // custom number
        var patterns = [{
            re: '[0-9]+',
            value: 'number',
        },{
            re: /^PI$/,
            value: new Observation('number', 3.1415926),
        }];
        var scanner = new Scanner({
            patterns,
        });
        var ob = scanner.scan('123'); // string pattern
        should.deepEqual(ob, new Observation("number", 123, ob.t));
        var ob = scanner.scan('PI'); // RegExp pattern
        should.deepEqual(ob, new Observation("number", 3.1415926, ob.t));
        var ob = scanner.scan('PIT'); // no match
        should.deepEqual(ob, new Observation("scanned", "PIT", ob.t));
        var ob = scanner.scan("123.456");  // no match
        should.deepEqual(ob, new Observation("scanned", "123.456", ob.t));
    });
    it("TESTTESTtransform(is,os) transforms input to output stream", (done) => {
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
            var odata = fs.readFileSync(ospath);
            var otext = odata.toString();
            //console.log(`dbg odata`, odata);
            var ojs = otext.trim().split('\n').map(line => 
                line && JSON.parse(line));
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
    it("scan(barcode) recognizes UPC/EAN codes", () => {
        var scanner = new Scanner();

        var code = "614141000036";
        var ob = scanner.scan(code);
        should.deepEqual(ob, new Observation(Scanner.TAG_UPCA, code, ob.t));

        var code = "9501101530003";
        var ob = scanner.scan(code);
        should.deepEqual(ob, new Observation(Scanner.TAG_EAN13, code, ob.t));

        var code = "95050003";
        var ob = scanner.scan(code);
        should.deepEqual(ob, new Observation(Scanner.TAG_UPCE_EAN8, code, ob.t));

        var code = "06141939";
        var ob = scanner.scan(code);
        should.deepEqual(ob, new Observation(Scanner.TAG_UPCE_EAN8, code, ob.t));

    });

})
