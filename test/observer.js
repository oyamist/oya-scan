(typeof describe === 'function') && describe("observer", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const {
        Readable,
        Writable,
        Transform,
    } = require('stream');
    const { js, logger } = require('just-simple').JustSimple;
    const {
        Observation,
        Observer,
    } = require('../index');
    var logLevel = false;

    // Example of an observation filter that adds 1
    class Add1 extends Observer {
        observe(ob) { // override observe() method to add 1
            return new Observation('test', ob.value+1);
        }
    }

    class Minus extends Observer {
        observe(ob) { // override observe() method to add 1
            return new Observation('test', -ob.value);
        }
    }

    function testWritable({done, expected, logLevel}) {
        var total = 0;
        var nOut = 0;
        return new Writable({
            objectMode: true,
            write(ob, encoding, callback) {
                try {
                    total += ob.value;
                    logLevel && logger[logLevel]({
                        output: js.simpleString(ob),
                        total,
                    });
                    callback();  

                    logLevel && logger[logLevel](`dbg`, {nOut, total});
                    should(total).equal(expected[nOut]);
                    if (++nOut >= expected.length) {
                        done();
                    }
                } catch(e) {
                    done(e);
                }
            }  
        });
    }

    it("default ctor", done=>{
        (async function(){ try {
            var obr = new Observer();
            should(obr.transform).instanceOf(Transform);
            should(obr.transform._writableState).properties({
                objectMode: true,
            });
            should(obr.transform._readableState).properties({
                objectMode: true,
            });
            done();
        } catch(e) {done(e);} })();
    });
    it("single input, single output", done=>{
        (async function(){ try {
            var obr = new Observer({
                logLevel,
            });
            const input = obr.inputStream;
            var output = testWritable({
                done, 
                expected: [1,3,6,10], 
                logLevel,});
            obr.pipeline(output);
            input.push(new Observation('test', 1));
            input.push(new Observation('test', 2));
            input.push(new Observation('test', 3));
            input.push(new Observation('test', 4));
        } catch(e) {done(e);} })();
    });
    it("Observers can be piped", done=>{
        (async function(){ try {
            var a1 = new Add1({
                logLevel,
            });
            var passThrough = new Observer();
            var input = a1.inputStream;
            const output = testWritable({
                done, 
                expected: [2,5,9,14], 
                logLevel,
            });
            a1.transform.pipe(passThrough.transform);
            passThrough.transform.pipe(output);
            input.push(new Observation('test', 1));
            input.push(new Observation('test', 2));
            input.push(new Observation('test', 3));
            input.push(new Observation('test', 4));
        } catch(e) {done(e);} })();
    });
    it("Observers can be piped", done=>{
        (async function(){ try {
            var a1 = new Add1({
                logLevel,
            });
            var passThrough = new Observer();
            var minus = new Minus();
            const output = testWritable({
                done, 
                expected:[-2,-5,-9,-14], 
                logLevel,
            });
            var input = a1.pipeline(
                passThrough, 
                minus, 
                output
            );
            input.push(new Observation('test', 1));
            input.push(new Observation('test', 2));
            input.push(new Observation('test', 3));
            input.push(new Observation('test', 4));
        } catch(e) {done(e);} })();
    });
    it("pushLine() process input line", done=>{
        (async function(){ try {
            var obr = new Observer({
                logLevel,
            });
            var output = testWritable({
                done, 
                expected: [1,3,6,10], 
                logLevel,});
            obr.pipeline(output);

            // push input
            obr.pushLine(`{"tag":"test", "value":1}`);
            obr.pushLine(`{"tag":"test", "value":2}`);
            obr.pushLine(`{"tag":"test", "value":3}`);
            obr.pushLine(`{"tag":"test", "value":4}`);
        } catch(e) {done(e);} })();
    });
    it("streamIn(is) accepts line input stream", done=>{
        (async function() { try {
            var is = new Readable({ read() {}, });
            var obr = new Observer({ logLevel, });
            var output = testWritable({
                done: e => e && done(e),
                expected: [1,3,6,10], 
                logLevel,});
            obr.pipeline(output);
            var promise = obr.streamIn(is);

            // Observer will create an observation for each
            // input line regardless of how it is presented
            // by the input stream.
            var inputText = [ // one observation per line
                `{"tag":"test", "value":1}`,
                `{"tag":"test", "value":2}`,
                `{"tag":"test", "value":3}`,
                `{"tag":"test", "value":4}`,
            ].join('\n');
            // test streaming of arbitrary size chunks
            [10, 30, 35, 36, 50, 70].forEach((ix,i) => {
                let chunk = inputText.substring(0,ix);
                inputText = inputText.substring(ix);
                is.push(chunk);
            });
            is.push(inputText); // remainder
            is.push(null); // eos

            // The returned promise provides a summary
            // that may be of some interest.
            var res = await promise;
            should(res).properties({
                bytes: 103,
                observations: 4,
            });
            should(res).properties(["started","ended"]);
            done();
        } catch(e) {done(e);} })();
    });
    it("streamIn(is) calls pushLine", done=>{
        (async function() { try {
            var is = new Readable({ read() {}, });
            var testLines = [];
            class TestObserver extends Observer {
                constructor(opts={}) {
                    super(opts);
                }
                pushLine(line) { // custom pushLine
                    super.pushLine(line);
                    // verify that pushLine is called
                    testLines = [...testLines, line];
                }
            };

            var obr = new TestObserver({ logLevel, });
            var output = testWritable({
                done: e => e && done(d),
                expected: [1,3,6,10], 
                logLevel,});
            obr.pipeline(output);
            var promise = obr.streamIn(is);

            var inputLines =  [
                `{"tag":"test", "value":1}`,
                `{"tag":"test", "value":2}`,
                `{"tag":"test", "value":3}`,
                `{"tag":"test", "value":4}`,
            ];
            is.push(inputLines.join('\n')); 
            is.push(null); // eos

            var res = await promise;
            should(res).properties({
                bytes: 103,
                observations: 4,
            });
            should(res).properties(["started","ended"]);
            should.deepEqual(testLines, inputLines);
            done();
        } catch(e) {done(e);} })();
    });
})
