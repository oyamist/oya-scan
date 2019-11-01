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
            var ot = new ObFilter();
            var nOut = 0;
            var total = 0;
            const input = ot.inputStream;
            const output = new Writable({
                objectMode: true,
                write(ob, encoding, callback) {
                    total += ob.value;
                    console.log({
                        output: js.simpleString(ob),
                        total,
                    });
                    switch (++nOut) {
                        case 1:
                            should(total).equal(1);
                            break;
                        case 2:
                            should(total).equal(3);
                            break;
                        case 3:
                            should(total).equal(6);
                            done();
                            break;
                    }
                    callback();  
                }  
            });
            ot.transform.pipe(output);
            input.push(new Observation('test', 1));
            input.push(new Observation('test', 2));
            input.push(new Observation('test', 3));
            input.push(new Observation('test', 4));
        } catch(e) {done(e);} })();
    });
    it("TESTTESTsubclass adds 1", done=>{
        (async function(){ try {
            class Add1 extends ObFilter {
                observe(ob) { // override observe() method to add 1
                    return new Observation('test', ob.value+1);
                }
            }
            var a1 = new Add1();
            var total = 0;
            var nOut = 0;
            var input = a1.inputStream;
            const output = new Writable({
                objectMode: true,
                write(ob, encoding, callback) {
                    total += ob.value;
                    console.log({
                        output: js.simpleString(ob),
                        total,
                    });
                    switch (++nOut) {
                        case 1:
                            should(total).equal(2);
                            break;
                        case 2:
                            should(total).equal(5);
                            break;
                        case 3:
                            should(total).equal(9);
                            done();
                            break;
                    }
                    callback();  
                }  
            });
            a1.transform.pipe(output);
            input.push(new Observation('test', 1));
            input.push(new Observation('test', 2));
            input.push(new Observation('test', 3));
        } catch(e) {done(e);} })();
    });
})
