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
    it("TESTTESTLineStream sources can be shared", done=>{
        (async function(){ try {
            var lineStream = path.join(__dirname, 'data', 'obs1234.json');
            var testSrc = new Source({ logLevel, lineStream, });
            var testSnk1 = new Aggregator({logLevel});
            var testSnk2 = new Aggregator({logLevel});

            // STEP 1: Shared sources must be built together
            var p1 = new Pipeline({logLevel})
                .build(testSrc, testSnk1);
            var p2 = new Pipeline({logLevel})
                .build(testSrc, testSnk2);
            var testObs1 = testSnk1.observations;
            var testObs2 = testSnk2.observations;
            should.deepEqual(testObs1.map(o=>js.simpleString(o)), []);
            should.deepEqual(testObs2.map(o=>js.simpleString(o)), []);

            // STEP 2: Shared sources must be initialized together
            await p1;
            await p2;

            should.deepEqual(testObs1.map(o=>js.simpleString(o)), [
                'test:1 kg', 'test:2 kg', 'test:3 kg', 'test:4 kg', ]);
            should.deepEqual(testObs2.map(o=>js.simpleString(o)), [
                'test:1 kg', 'test:2 kg', 'test:3 kg', 'test:4 kg', ]);

            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTObservation sources can be shared", done=>{
        (async function(){ try {
            var observations = [
                new Observation('test', 1),
                new Observation('test', 2),
                new Observation('test', 3),
            ];
            var testSrc = new Source({ logLevel, observations, });
            var testSnk1 = new Aggregator({logLevel});
            var testSnk2 = new Aggregator({logLevel});

            // STEP 1: Shared sources must be built together
            var p1 = new Pipeline({logLevel}).build(testSrc, testSnk1);
            var p2 = new Pipeline({logLevel}).build(testSrc, testSnk2);

            // STEP 2: Shared sources must be initialized together
            await p1; // initialize pipeline
            await p2; // initialize pipeline
            should.deepEqual(testSnk1.observations, observations);
            should.deepEqual(testSnk2.observations, observations);

            done();
        } catch(e) {done(e);} })();
    });
})
