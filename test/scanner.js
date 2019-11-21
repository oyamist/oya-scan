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
        Aggregator,
        GrammarFactory,
        Observation,
        Pipeline,
        Scanner,
        Source,
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
        });
        should.deepEqual(scanner.patterns, [
            Scanner.MATCH_OBSERVATION,
            Scanner.MATCH_TINYOBS,
        ]);

        // numbers aren't special
        should(scanner.scan('123').toString()).equal('scanned:123');
        should(scanner.scan('12.34').toString()).equal('scanned:12.34');
    });
    it("custom ctor",() => {
        // custom scanner recognizes integers
        var map = TESTMAP;
        var tag = 'string'; 
        var patterns = [{ 
            re: /^[0-9]+$/,
            value: 'integer', 
        }];
        var scanner = new Scanner({ map, tag, patterns, });
        should(scanner).properties({ map, tag, patterns });

        should(scanner.scan('123').toString()).equal('integer:123');
        should(scanner.scan('12.34').toString()).equal('string:12.34');
    });
    it("scan(data) => mapped Observation (Object)", () => {
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
        should(dataout.toString()).equal('color:red');

        // mapped data
        var dataout = scanner.scan("a0003");
        should(Date.now() - dataout.t).above(-1).below(5);
        should(dataout.toString()).equal('height:5');
    });
    it("scan(data) => mapped Observation (function)", ()=>{
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
        should(dataout.toString()).equal('color:red');
    });
    it("scan() serialized Observations", () => {
        var scanner = new Scanner();
        var obIn = new Observation("weight", 123, "kg");
        var ob = scanner.scan(JSON.stringify(obIn));
        should.deepEqual(ob, obIn);
    });
    it("scan() Tiny Observations", () => {
        var scanner = new Scanner();

        var ob = scanner.scan('{tg:val:ty}'); // 3 parts
        should.deepEqual(ob, new Observation('tg', 'val', 'ty', ob.t));
        var ob = scanner.scan('{tg:val}'); // 2 parts
        should.deepEqual(ob, new Observation('tg', 'val', undefined, ob.t));
    });
    it("scan(data) custom patterns", () => {
        var scanner = new Scanner({
            patterns: [ Scanner.MATCH_NUMBER ],
        });

        // default number pattern
        should(scanner.scan('123.456').toString()).equal('number:123.456');
        should(scanner.scan('-12.34').toString()).equal('number:-12.34');
        should(scanner.scan('1').toString()).equal('number:1');
        should(scanner.scan('42').toString()).equal('number:42');

        // custom number
        var scanner = new Scanner({ 
            patterns: [{
                re: '[0-9]+',
                value: 'integer',
            },{
                re: /^PI$/,
                value: new Observation('float', 3.1415926),
            }],
        });
        should(scanner.scan('123').toString()).equal('integer:123');
        should(scanner.scan('PI').toString()).equal('float:3.1415926');
        should(scanner.scan('PIT').toString()).equal('scanned:PIT');
        should(scanner.scan('12.3').toString()).equal('scanned:12.3');
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
    it("lineStream", done=>{
        (async function() { try {
            var logLevel = 'info';
            console.log('dbg scanner test');
            var lineStream = path.join(__dirname, 'data', 'a0001.txt');
            var scanner = new Scanner({ 
                logLevel, 
                map: TESTMAP, 
                lineStream,
            });

            // Bind output stream
            var testSnk = new Aggregator({logLevel});
            var pipeline = await new Pipeline({logLevel})
                .build(scanner, testSnk);
            var testObs = testSnk.observations;
            should.deepEqual(testObs.map(ob => js.simpleString(ob)), [
                `color:red`,
                `color:blue`,
                `height:5`,
                `height:10`,
            ]);

            done();
        } catch(e) {done(e)} })();
    });
    it("calc-map Scanner ", done=>{
        (async function() { try {
            var gf = new GrammarFactory(GrammarFactory.OPTS_TERSE);
            var mpath = path.join(__dirname, 'data', 'calc-map.json');
            var map = JSON.parse(fs.readFileSync(mpath));
            var scanner = new Scanner({ map, logLevel, });
            var scan0 = "  0  " ;
            var scan1 = "  1  " ;
            var scan2 = "  2  " ;
            var scan3 = "  3  " ;
            var scan4 = "  4  " ;
            var scan5 = "  5  " ;
            var scan6 = "  6  " ;
            var scan7 = "  7  " ;
            var scan8 = "  8  " ;
            var scan9 = "  9  " ;
            var scanPlus = "  +  ";
            var scanMinus = "  -  ";
            var scanMultiply = "  *  ";
            var scanDivide = "  /  ";
            var scanEqual = "  =  ";
            should(scanner.scan(scan0)+'').equal('D:0');
            should(scanner.scan(scan1)+'').equal('D:1');
            should(scanner.scan(scan2)+'').equal('D:2');
            should(scanner.scan(scan3)+'').equal('D:3');
            should(scanner.scan(scan4)+'').equal('D:4');
            should(scanner.scan(scan5)+'').equal('D:5');
            should(scanner.scan(scan6)+'').equal('D:6');
            should(scanner.scan(scan7)+'').equal('D:7');
            should(scanner.scan(scan8)+'').equal('D:8');
            should(scanner.scan(scan9)+'').equal('D:9');
            should(scanner.scan(scanPlus)+'').equal('"+":+');
            should(scanner.scan(scanMinus)+'').equal('"-":-');
            should(scanner.scan(scanMultiply)+'').equal('"*":*');
            should(scanner.scan(scanDivide)+'').equal('"/":/');
            should(scanner.scan(scanEqual)+'').equal('"=":=');
            done();
        } catch(e) {done(e)} })();
    });
})
