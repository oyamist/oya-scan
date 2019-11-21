(typeof describe === 'function') && describe("sink", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const { js, logger } = require('just-simple').JustSimple;
    const { Writable, Transform } = require('stream');
    const {
        Aggregator,
        Observation,
        Pipeline,
        Source,
        Sink,
    } = require('../index');
    var logLevel = false;

    it("TESTTESTdefault ctor", done=>{
        (async function(){ try {
            var snk = new Sink();
            should(snk.transform).instanceOf(Transform);
            should(snk.transform._writableState).properties({
                objectMode: true,
            });
            should(snk.transform._readableState).properties({
                objectMode: false,
            });
            should(snk.outputStream).equal(undefined);
            should(typeof snk.observationToString === 'function');
            var ob = new Observation('test', 1, 'kg');
            should(snk.observationToString(ob)).equal(JSON.stringify(ob));
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTsave observations to a file", done=>{
        (async function(){ try {
            var observations = [
                new Observation('test', 1, 'kg'),
                new Observation('test', 2, 'kg'),
            ];
            var testSrc = new Source({logLevel, observations});
            var outPath = tmp.tmpNameSync();
            var outputStream = fs.createWriteStream(outPath);
            var testSnk = new Sink({
                logLevel,
                outputStream,
            });
            should(testSnk.outputStream).equal(outputStream);
            await new Pipeline({logLevel}).build(testSrc, testSnk);
            var outText = (await fs.promises.readFile(outPath)).toString();
            should(outText).equal(observations.reduce(
                (a,o) => a + (JSON.stringify(o)+'\n'), 
                ''));
            fs.promises.unlink(outPath);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTsave formatted observations to a file", done=>{
        (async function(){ try {
            var observations = [
                new Observation('test', 1, 'kg'),
                new Observation('test', 2, 'kg'),
            ];
            var testSrc = new Source({logLevel, observations});
            var outPath = tmp.tmpNameSync();
            var outputStream = fs.createWriteStream(outPath);
            var observationToString = ob=> {
                var { t, type, tag, value, } = ob;
                return `${tag}:${value} ${type}`;
            };
            var testSnk = new Sink({
                logLevel,
                observationToString,
                outputStream,
            });
            should(testSnk.observationToString).equal(observationToString);
            should(testSnk.outputStream).equal(outputStream);
            await new Pipeline({logLevel}).build(testSrc, testSnk);
            var outText = (await fs.promises.readFile(outPath)).toString();
            should(outText).equal([
                'test:1 kg\n',
                'test:2 kg\n',
            ].join(''));
            fs.promises.unlink(outPath);
            done();
        } catch(e) {done(e);} })();
    });
});
