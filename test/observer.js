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
        Pipeline,
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
                    logLevel && logger[logLevel](`testWritable.write(${
                        js.simpleString(ob)
                    }) nOut:${ nOut } total:${total }`);
                    callback();  

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
                name: 'test1-1',
                logLevel,
            });

            var {
                inputStream,
                outputStream,
                observers,
            } = await new Pipeline({
                logLevel,
            }).build(
                obr.createReadable(),
                obr, 
                testWritable({
                    done, 
                    expected: [1,3,6,10], 
                    logLevel,
                })
            );

            should.deepEqual(observers, [obr]);
            inputStream.push(new Observation('test', 1));
            inputStream.push(new Observation('test', 2));
            inputStream.push(new Observation('test', 3));
            inputStream.push(new Observation('test', 4));
        } catch(e) {done(e);} })();
    });
    it("Observers can be piped", done=>{
        (async function(){ try {
            var a1 = new Add1({
                logLevel,
            });
            var passThrough = new Observer();
            var input = a1.createReadable();
            a1.streamIn(input);
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
            var passThrough = new Observer({
                logLevel,
            });
            var minus = new Minus({
                logLevel,
            });
            var {
                inputStream,
            } = await new Pipeline({
                logLevel,
            }).build(
                a1.createReadable(),
                a1,
                passThrough,
                new Minus(),
                testWritable({
                    done, 
                    expected:[-2,-5,-9,-14], 
                    logLevel,
                })
            );
            should(inputStream._readableState.objectMode).equal(true);
            inputStream.push(new Observation('test', 1));
            inputStream.push(new Observation('test', 2));
            inputStream.push(new Observation('test', 3));
            inputStream.push(new Observation('test', 4));
        } catch(e) {done(e);} })();
    });
    it("pushLine() process input line", done=>{
        (async function(){ try {
            var obr = new Observer({logLevel});
            var {
                observers,
            } = await new Pipeline({
                logLevel,
            }).build(
                obr.createReadable(),
                obr,
                testWritable({ done, expected: [1,3,6,10], logLevel,})
            );

            obr.pushLine(`{"tag":"test", "value":1}`);
            obr.pushLine(`{"tag":"test", "value":2}`);
            obr.pushLine(`{"tag":"test", "value":3}`);
            obr.pushLine(`{"tag":"test", "value":4}`);
        } catch(e) {done(e);} })();
    });
    it("streamIn(is) accepts text stream", done=>{
        (async function() { try {
            // Examples of text streams:
            //   * process.stdin is a text stream
            //   * fs.createReadStream() creates a text stream
            // For testing, we create our own text stream
            // to verify that chunking boundaries are handled
            // properly.
            var textStream = new Readable({ read() {}, }); 
            var obr = new Observer({ logLevel, });
            var promise = obr.streamIn(textStream);
            var pipeline = await new Pipeline({ logLevel, }).build(
                obr,
                testWritable({
                    done: e => e && done(e),
                    expected: [1,3,6,10], 
                    logLevel,
                })
            );

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
                textStream.push(chunk);
            });
            textStream.push(inputText); // remainder
            textStream.push(null); // eos

            // The returned promise resolves to a summary
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
            var pipeline = await new Pipeline({logLevel})
                .build(is, obr, output);

            var inputLines =  [
                `{"tag":"test", "value":1}`,
                `{"tag":"test", "value":2}`,
                `{"tag":"test", "value":3}`,
                `{"tag":"test", "value":4}`,
            ];
            is.push(inputLines.join('\n')); 
            is.push(null); // eos

            var res = await pipeline.inputPromise;
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
