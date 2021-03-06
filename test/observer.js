(typeof describe === 'function') && describe("observer", function() {
    const should = require("should");
    const { Transform, } = require('stream');
    const { js, logger } = require('just-simple').JustSimple;
    const {
        Aggregator,
        Observation,
        Observer,
        Pipeline,
        Source,
    } = require('../index');
    var logLevel = false;

    // Example of an observation filter that adds 1
    class Add1 extends Observer {
        observe(ob) { // override observe() method to add 1
            return new Observation('test', ob.value+1);
        }
    }

    it("default ctor", done=>{
        (async function(){ try {
            var obr = new Observer();
            should(obr.transform).instanceOf(Transform);
            should(obr.transform._writableState)
                .properties({ objectMode: true, });
            should(obr.transform._readableState)
                .properties({ objectMode: true, });
            should(obr.initialized).equal(false);
            done();
        } catch(e) {done(e);} })();
    });
    it("initialize()", done=> {
        (async function(){ try {
            var obr = new Observer({logLevel});
            should(obr.initialized).equal(false);
            await obr.initialize();
            should(obr.initialized).equal(true);
            done();
        } catch(e) {done(e);} })();
    });
    it("observe(ob) processes observation", done=> {
        (async function(){ try {
            var obr = new Observer({logLevel});
            var ob = new Observation('test', 42);

            // observe() requires initialization
            should(obr.initialized).equal(false);
            should.throws(() => {
                obr.observe(ob);
            });

            // observe() is passthrough by default
            await obr.initialize();
            should(obr.observe(ob)).equal(ob);
            done();
        } catch(e) {done(e);} })();
    });
    it("Observers can be piped", done=>{
        (async function(){ try {
            var observations = [
                new Observation('test', 1),
                new Observation('test', 2),
                new Observation('test', 3),
                new Observation('test', 4),
            ];
            var testSrc = new Source({logLevel, observations});
            var add1 = new Add1({ logLevel });
            var testSnk = new Aggregator({ logLevel });
            var pipeline = await new Pipeline({ logLevel })
                .build(testSrc, add1, testSnk);
            var testObs = testSnk.observations;
            should.deepEqual(testObs.map(o=>js.simpleString(o)), [
                'test:2', 'test:3', 'test:4', 'test:5', ]);
            done();
        } catch(e) {done(e);} })();
    });
})
