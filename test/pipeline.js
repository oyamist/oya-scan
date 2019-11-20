(typeof describe === 'function') && describe("pipeline", function() {
    const winston = require('winston');
    const should = require("should");
    const {
        Aggregator,
        Observation,
        Pipeline,
        Source,
    } = require("../index");
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;
    const logLevel = false;

    it("TESTTESTdefault ctor", function() {
        var pipeline = new Pipeline();
        should(pipeline).properties({
            logLevel: 'info',
            observers: [],
        });
    });
    it("TESTTESTcustom ctor", function() {
        var logLevel = 'debug';
        var pipeline = new Pipeline({
            logLevel,
        });
        should(pipeline).properties({
            logLevel,
            observers: [],
        });
    });
    it("TESTTESTbuild() creates pipeline", done=>{
        (async function(){ try {
            var observations = [
                new Observation('test', 1),
                new Observation('test', 2),
                new Observation('test', 3),
                new Observation('test', 4),
            ];
            var testSrc = new Source({ logLevel, observations, });
            var testSnk = new Aggregator();
            var promise = new Pipeline().build(testSrc, testSnk);
            should.deepEqual(testSnk.observations, []);
            var pipeline = await(promise);
            should.deepEqual(testSnk.observations, observations);
            should(pipeline).instanceOf(Pipeline);
            should.deepEqual(pipeline.observers, [testSrc, testSnk]);
            done();
        } catch(e) {done(e);} })();
    });

})
