(typeof describe === 'function') && describe("scanner", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const { js, logger } = require('just-simple').JustSimple;
    const {
        Readable,
        Writable,
    } = require('stream');
    const {
        Observation,
        Pipeline,
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
    const logLevel = false;

    it("default ctor", () => {
        var scanner = new Scanner();
        should(scanner).instanceOf(Scanner);
        should.deepEqual(scanner.map, {});
        should(scanner).properties({
            tag: Scanner.TAG_SCANNED,
            patterns: [],
        });

        // floating point number
        var ob = scanner.scan('1');
        should.deepEqual(ob, new Observation("scanned", "1", null, ob.t));
        var ob = scanner.scan('42');
        should.deepEqual(ob, new Observation("scanned", "42", null, ob.t));
        var ob = scanner.scan('123.456');
        should.deepEqual(ob, new Observation("scanned", "123.456", null, ob.t));
        var ob = scanner.scan('-123.456');
        should.deepEqual(ob, new Observation("scanned", "-123.456", null, ob.t));

        // not a number
        var ob = scanner.scan('123,456');
        should.deepEqual(ob, new Observation("scanned", '123,456', null, ob.t));
        var ob = scanner.scan('123.456.789');
        should.deepEqual(ob, new Observation("scanned", '123.456.789', null, ob.t));
        var ob = scanner.scan('+1');
        should.deepEqual(ob, new Observation("scanned", '+1', null, ob.t));
        var ob = scanner.scan('1a1');
        should.deepEqual(ob, new Observation("scanned", '1a1', null, ob.t));
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
        should.deepEqual(ob, new Observation('number', 123, null, ob.t));
        var ob = scanner.scan('123.456');
        should.deepEqual(ob, new Observation('barcode', "123.456", null, ob.t));
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

        // mapped data
        var dataout = scanner.scan("a0003");
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
        var scanner = new Scanner({
            patterns: [ Scanner.MATCH_NUMBER ],
        });

        // default number pattern
        var ob = scanner.scan("123.456");
        should.deepEqual(ob, new Observation("number", 123.456, null, ob.t));
        var ob = scanner.scan('1');
        should.deepEqual(ob, new Observation("number", 1, null, ob.t));
        var ob = scanner.scan('42');
        should.deepEqual(ob, new Observation("number", 42, null, ob.t));
        var ob = scanner.scan('123.456');
        should.deepEqual(ob, new Observation("number", 123.456, null, ob.t));
        var ob = scanner.scan('-123.456');
        should.deepEqual(ob, new Observation("number", -123.456, null, ob.t));

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
        should.deepEqual(ob, new Observation("number", 123, null, ob.t));
        var ob = scanner.scan('PI'); // RegExp pattern
        should.deepEqual(ob, new Observation("number", 3.1415926, null, ob.t));
        var ob = scanner.scan('PIT'); // no match
        should.deepEqual(ob, new Observation("scanned", "PIT", null, ob.t));
        var ob = scanner.scan("123.456");  // no match
        should.deepEqual(ob, new Observation("scanned", "123.456", null, ob.t));
    });
    it("transformLegacy(is,os) transforms input to output stream", done=>{
        (async function() { try {
            var scanner = new Scanner({
                map: TESTMAP,
            });
            var ispath = path.join(__dirname, 'data', 'a0001.txt');
            var is = fs.createReadStream(ispath);
            var ospath = tmp.tmpNameSync();
            var os = fs.createWriteStream(ospath);

            // transformLegacy returns a Promise
            var result = await scanner.transformLegacy(is, os);

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
            if (ojs[1] == null) {
                console.log(`dbg ojs`, ojs);
            }
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
        var scanner = new Scanner({
            patterns: [
                Scanner.MATCH_UPCA,
                Scanner.MATCH_EAN13,
                Scanner.MATCH_UPCE_EAN8,
                Scanner.MATCH_NUMBER,
            ],
        });

        var code = "614141000036";
        var ob = scanner.scan(code);
        should.deepEqual(ob, 
            new Observation(Scanner.TAG_UPCA, code, null, ob.t));

        var code = "9501101530003";
        var ob = scanner.scan(code);
        should.deepEqual(ob, 
            new Observation(Scanner.TAG_EAN13, code, null, ob.t));

        var code = "95050003";
        var ob = scanner.scan(code);
        should.deepEqual(ob, 
            new Observation(Scanner.TAG_UPCE_EAN8, code, null, ob.t));

        var code = "06141939";
        var ob = scanner.scan(code);
        should.deepEqual(ob, 
            new Observation(Scanner.TAG_UPCE_EAN8, code, null, ob.t));

        var code = "1234";
        var ob = scanner.scan(code);
        should.deepEqual(ob, 
            new Observation(Scanner.TAG_NUMBER, 1234, null, ob.t));
    });
    it("streamIn ", done=>{
        (async function() { try {
            var scanner = new Scanner({
                map: TESTMAP,
                logLevel,
            });

            // Bind output stream
            var obOut = [];
            var ispath = path.join(__dirname, 'data', 'a0001.txt');
            var is = fs.createReadStream(ispath);
            var os = scanner.createWritable(ob => obOut.push(ob));
            var pipeline = new Pipeline({logLevel})
                .build(is, scanner, os);

            // Pipeline is synchronous, so output is done
            // when input is done and promise is resolved.
            var result = await pipeline.inputPromise;
            should(result).properties(['started', 'ended']);
            should(result).properties({
                bytes: 24,
                observations: 4,
            });
            should(result.started).instanceOf(Date);
            should(result.ended).instanceOf(Date);

            should.deepEqual(obOut.map(ob => js.simpleString(ob)), [
                `color:red`,
                `color:blue`,
                `height:5`,
                `height:10`,
            ]);

            done();
        } catch(e) {done(e)} })();
    });
})
