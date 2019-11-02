(typeof describe === 'function') && describe("ob-filter", function() {
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
        ObFilter,
    } = require('../index');
    var logLevel = false;

    // Example of an observation filter that adds 1
    class Add1 extends ObFilter {
        observe(ob) { // override observe() method to add 1
            return new Observation('test', ob.value+1);
        }
    }

    class Minus extends ObFilter {
        observe(ob) { // override observe() method to add 1
            return new Observation('test', -ob.value);
        }
    }

    function createWritable({done, expected, logLevel}) {
        var total = 0;
        var nOut = 0;
        return new Writable({
            objectMode: true,
            write(ob, encoding, callback) {
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
            }  
        });
    }

    it("TESTTESTdefault ctor", done=>{
        (async function(){ try {
            var ot = new ObFilter();
            should(ot.transform).instanceOf(Transform);
            should(ot.transform._writableState).properties({
                objectMode: true,
            });
            should(ot.transform._readableState).properties({
                objectMode: true,
            });
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTsingle input, single output", done=>{
        (async function(){ try {
            var ot = new ObFilter({
                logLevel,
            });
            const input = ot.inputStream;
            var output = createWritable({
                done, 
                expected: [1,3,6,10], 
                logLevel,});
            ot.pipeline(output);
            input.push(new Observation('test', 1));
            input.push(new Observation('test', 2));
            input.push(new Observation('test', 3));
            input.push(new Observation('test', 4));
        } catch(e) {done(e);} })();
    });
    it("TESTTESTObFilters can be piped", done=>{
        (async function(){ try {
            var a1 = new Add1({
                logLevel,
            });
            var passThrough = new ObFilter();
            var input = a1.inputStream;
            const output = createWritable({
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
    it("TESTTESTObFilters can be piped", done=>{
        (async function(){ try {
            var a1 = new Add1({
                logLevel,
            });
            var passThrough = new ObFilter();
            var minus = new Minus();
            const output = createWritable({
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
})
