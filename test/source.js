(typeof describe === 'function') && describe("source", function() {
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
        Source,
        Pipeline,
    } = require('../index');
    var logLevel = false;

    class TestSink extends Observer {
        constructor(opts={}) {
            super(opts);
            this.observations = [];
        }

        observe(ob) {
            console.log("TESTSINK observe", ob);
            this.observations.push(ob);
            return null;
        }
    }

    it("TESTTESTdefault ctor", done=>{
        (async function(){ try {
            var src = new Source();
            should(src.transform).instanceOf(Transform);
            should(src.transform._writableState).properties({
                objectMode: true,
            });
            should(src.transform._readableState).properties({
                objectMode: true,
            });
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTcustom ctor", done=>{
        (async function(){ try {
            var logLevel = 'debug';
            var name = "test1";
            var src = new Source({ name, logLevel, });
            should(src).properties({ name, logLevel, });
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTinitialize() starts data source", done=>{
        (async function(){ try {
            var logLevel = 'info';
            var observations = [ new Observation('hello', 'world'), ];
            var testSource = new Source({ logLevel, observations, });
            var testSink = new TestSink();
            var pipeline = await new Pipeline({logLevel}).build(
                testSource,
                testSink,
            );

            should(testSink.observations.length).equal(0);
            var pInit = testSource.initialize();
            should(pInit).instanceOf(Promise);
            await pInit;
            should.deepEqual(testSink.observations, observations);

            done();
        } catch(e) {done(e);} })();
    });
})
