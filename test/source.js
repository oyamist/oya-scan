(typeof describe === 'function') && describe("source", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const { js, logger } = require('just-simple').JustSimple;
    const { Transform } = require('stream');
    const {
        Aggregator,
        Observation,
        Source,
        Pipeline,
    } = require('../index');
    var logLevel = false;

    it("default ctor", done=>{
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
    it("custom ctor", done=>{
        (async function(){ try {
            var logLevel = 'debug';
            var name = "test1";
            var src = new Source({ name, logLevel, });
            should(src).properties({ name, logLevel, });
            done();
        } catch(e) {done(e);} })();
    });
    it("initialize() observations", done=>{
        (async function(){ try {
            var logLevel = 'info';
            var observations = [ new Observation('hello', 'world'), ];
            var testSource = new Source({ logLevel, observations, });
            var testSink = new Aggregator();
            var promise = new Pipeline({logLevel})
                .build(testSource, testSink);

            should(testSink.observations.length).equal(0);
            await promise;
            should.deepEqual(testSink.observations, observations);

            done();
        } catch(e) {done(e);} })();
    });
    it("initialize() lineStream ReadStream", done=>{
        (async function(){ try {
            var ispath = path.join(__dirname, 'data', 'obs1234.json');
            var lineStream = fs.createReadStream(ispath);
            var testSource = new Source({ logLevel, lineStream, });
            var testSink = new Aggregator({logLevel});
            var promise = new Pipeline({logLevel})
                .build(testSource, testSink);

            should(testSink.observations.length).equal(0);
            await promise;
            var testObs = testSink.observations;
            should.deepEqual(testObs.map(o=>js.simpleString(o)), [
                'test:1 kg', 'test:2 kg', 'test:3 kg', 'test:4 kg', ]);

            done();
        } catch(e) {done(e);} })();
    });
    it("initialize() lineStream path", done=>{
        (async function(){ try {
            var lineStream = path.join(__dirname, 'data', 'obs1234.json');
            var testSource = new Source({ logLevel, lineStream, });
            var testSink = new Aggregator({logLevel});
            var promise = new Pipeline({logLevel})
                .build(testSource, testSink);
            var testObs = testSink.observations;
            should.deepEqual(testObs.map(o=>js.simpleString(o)), []);
            await promise;
            should.deepEqual(testObs.map(o=>js.simpleString(o)), [
                'test:1 kg', 'test:2 kg', 'test:3 kg', 'test:4 kg', ]);

            done();
        } catch(e) {done(e);} })();
    });
})
