(typeof describe === 'function') && describe("observation-transform", function() {
    const should = require("should");
    const { Transform, } = require('stream');
    const { js, logger } = require('just-simple').JustSimple;
    const {
        Observation,
        ObservationTransform,
    } = require('../index');
    var logLevel = false;

    it("TESTTESTdefault ctor", done=>{
        (async function(){ try {
            var obr = new ObservationTransform();
            should(obr.transform).instanceOf(Transform);
            should(obr.transform._writableState)
                .properties({ objectMode: true, });
            should(obr.transform._readableState)
                .properties({ objectMode: true, });
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTinitialize()", done=> {
        (async function(){ try {
            var obr = new ObservationTransform({logLevel});
            should(obr.initialized).equal(false);
            await obr.initialize();
            should(obr.initialized).equal(true);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTobserve(ob) processes observation", done=> {
        (async function(){ try {
            var obr = new ObservationTransform({logLevel});
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
})
