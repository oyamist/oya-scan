(typeof describe === 'function') && describe("pipeline", function() {
    const winston = require('winston');
    const should = require("should");
    const {
        Observation,
        Observer,
        Pipeline,
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

    class RunningTotal extends Observer {
        constructor(opts={}) { super(opts);
            this.total = 0;
        }

        observe(ob) { 
            this.total += ob.value;
            return new Observation('total', this.total);
        }
    }

    class TestSink extends Observer {
        constructor(opts={}) {
            super(opts);
            this.observations = [];
        }
        observe(ob) {
            this.observations.push(ob);
        }
    }

    function testWritable({done, expected, logLevel}) {
        var total = 0;
        var nOut = 0;
        return new Writable({
            objectMode: true,
            write(ob, encoding, callback) {
                try {
                    total += ob.value;
                    logLevel && logger[logLevel](`testWritable.write(${
                        js.simpleString(ob)
                    }) nOut:${ nOut } total:${total }`);
                    callback();  

                    should(total).equal(expected[nOut]);
                    if (++nOut >= expected.length) {
                        done();
                    }
                } catch(e) {
                    done(e);
                }
            }  
        });
    }

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
            var sum = new RunningTotal();
            var source = sum.createReadable(); 
            var sink = new TestSink();
            var {
                inputPromise,
                inputStream,
            } = await new Pipeline().build(
                source, // Readable
                sum, // Observer
                sink, // Writable
            );

            inputStream.push(new Observation('test', 1));
            inputStream.push(new Observation('test', 2));
            inputStream.push(new Observation('test', 3));
            inputStream.push(new Observation('test', 4));
            inputStream.push(null);

            // outputs should be flushed when input ends
            await(inputPromise); 

            var i = 0;
            var obs = sink.observations;
            should(obs[i++]).properties({ tag: 'total', value: 1, });
            should(obs[i++]).properties({ tag: 'total', value: 3, });
            should(obs[i++]).properties({ tag: 'total', value: 6, });
            should(obs[i++]).properties({ tag: 'total', value: 10, });
            should(sink.observations.length).equal(4);
            done();
        } catch(e) {done(e);} })();
    });

})
