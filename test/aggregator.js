(typeof describe === 'function') && describe("aggregator", function() {
    const winston = require('winston');
    const should = require("should");
    const {
        Aggregator,
        Observation,
        Observer,
        Pipeline,
        Source,
    } = require("../index");
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;
    const {
        Readable,
        Writable,
    } = require('stream');
    const logLevel = false;

    const observations = [
        new Observation('test', 1, 'kg'),
        new Observation('test', 2, 'kg'),
        new Observation('test', 3, 'kg'),
        new Observation('test', 4, 'kg'),
    ];

    it("default ctor", function() {
        var agg = new Aggregator();
        should(agg).properties({
            logLevel: 'info',
            collect: true,
            sum: false,
            min: false,
            max: false,
            avg: false,
            count: false,
        });
    });
    it("custom ctor", function() {
        var opts = {
            logLevel,
            collect: false,
            sum: true,
            min: true,
            max: true,
            avg: true,
            count: true,
        }
        var expected = Object.assign({}, opts);
        var agg = new Aggregator(opts);
        should(agg).properties(expected);
    });
    it("default Aggregator collects observations", done=>{
        (async function(){ try {
            var testSrc = new Source({ logLevel, observations });
            var testSnk = new Aggregator({logLevel});
            var pipeline = await new Pipeline().build(testSrc, testSnk);
            should.deepEqual(testSnk.observations, observations);
            done();
        } catch(e) {done(e);} })();
    });
    it("average", done=>{
        (async function(){ try {
            var testSrc = new Source({ logLevel, observations });
            var agg = new Aggregator({ logLevel, avg: true });
            var testSnk = new Aggregator({logLevel})
            var pipeline = await new Pipeline({logLevel})
                .build( testSrc, agg, testSnk);
            should.deepEqual(testSnk.observations
                .map(o=>js.simpleString(o)), [
                    'test:1 kg', 
                    'test:1.5 kg', 
                    'test:2 kg', 
                    'test:2.5 kg'
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("sum", done=>{
        (async function(){ try {
            var testSrc = new Source({ logLevel, observations });
            var agg = new Aggregator({ logLevel, sum: true });
            var testSnk = new Aggregator({logLevel})
            var pipeline = await new Pipeline({logLevel})
                .build( testSrc, agg, testSnk);
            should(agg.observations.length).equal(0);
            should.deepEqual(testSnk.observations
                .map(o=>js.simpleString(o)), [
                    'test:1 kg', 
                    'test:3 kg', 
                    'test:6 kg', 
                    'test:10 kg'
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("sum", done=>{
        (async function(){ try {
            var testSrc = new Source({ logLevel, observations });
            var agg = new Aggregator({ logLevel, sum: true });
            var testSnk = new Aggregator({logLevel})
            var pipeline = await new Pipeline({logLevel})
                .build( testSrc, agg, testSnk);
            should(agg.observations.length).equal(0);
            should.deepEqual(testSnk.observations
                .map(o=>js.simpleString(o)), [
                    'test:1 kg', 
                    'test:3 kg', 
                    'test:6 kg', 
                    'test:10 kg'
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("count", done=>{
        (async function(){ try {
            var testSrc = new Source({ logLevel, observations });
            var agg = new Aggregator({ logLevel, count: true });
            var testSnk = new Aggregator({logLevel})
            var pipeline = await new Pipeline({logLevel})
                .build( testSrc, agg, testSnk);
            should(agg.observations.length).equal(0);
            should.deepEqual(testSnk.observations
                .map(o=>js.simpleString(o)), [
                    'test:1', 
                    'test:2', 
                    'test:3', 
                    'test:4'
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("min", done=>{
        (async function(){ try {
            var testSrc = new Source({ logLevel, observations });
            var agg = new Aggregator({ logLevel, min: true });
            var testSnk = new Aggregator({logLevel})
            var pipeline = await new Pipeline({logLevel})
                .build( testSrc, agg, testSnk);
            should(agg.observations.length).equal(0);
            should.deepEqual(testSnk.observations
                .map(o=>js.simpleString(o)), [
                    'test:1 kg', 
                    'test:1 kg', 
                    'test:1 kg', 
                    'test:1 kg'
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("max", done=>{
        (async function(){ try {
            var testSrc = new Source({ logLevel, observations });
            var agg = new Aggregator({ logLevel, max: true });
            var testSnk = new Aggregator({logLevel})
            var pipeline = await new Pipeline({logLevel})
                .build( testSrc, agg, testSnk);
            should(agg.observations.length).equal(0);
            should.deepEqual(testSnk.observations
                .map(o=>js.simpleString(o)), [
                    'test:1 kg', 
                    'test:2 kg', 
                    'test:3 kg', 
                    'test:4 kg'
            ]);
            done();
        } catch(e) {done(e);} })();
    });
    it("stats", done=>{
        (async function(){ try {
            var testSrc = new Source({ logLevel, observations });
            var agg = new Aggregator({ 
                logLevel, 
                max: true,
                min: true,
                sum: true,
                count: true,
                avg: true,
            });
            var testSnk = new Aggregator({logLevel})
            var pipeline = await new Pipeline({logLevel})
                .build( testSrc, agg, testSnk);
            should(agg.observations.length).equal(0);
            should.deepEqual(testSnk.observations
                .map(o=>js.simpleString(o)), [
                    'test:{min:1,max:1,sum:1,count:1,avg:1}', 
                    'test:{min:1,max:2,sum:3,count:2,avg:1.5}', 
                    'test:{min:1,max:3,sum:6,count:3,avg:2}', 
                    'test:{min:1,max:4,sum:10,count:4,avg:2.5}', 
            ]);
            done();
        } catch(e) {done(e);} })();
    });

})
