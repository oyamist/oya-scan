(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        Readable,
        Writable,
        Transform,
    } = require('stream');
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;
    const {
        exec,
    } = require('child_process');
    const Observation = require('./observation');

    class Observer {
        constructor(opts) {
            var that = this;
            logger.logInstance(that, opts);
            that.readSize = 0;
            Object.defineProperty(that, "pipelineArgs", {
                writable: true,
                value: undefined,
            });
            that.transform = new Transform({
                writableObjectMode: true,
                readableObjectMode: true,
                transform(ob, encoding, cb) {
                    if (ob instanceof Observation) {
                        that.transform.push(that.observe(ob));
                    } else {
                        that.transform.push(
                            new Error('expected Observation')
                        );
                    }
                    cb();
                }
            });
        }

        get inputStream() {
            var that = this;
            if (that._inputStream == null) {
                Object.defineProperty(that, "_inputStream", {
                    value: that.createReadable(),
                });
                that._inputStream.pipe(that.transform);
            }
            return that._inputStream;
        }

        pushLine(line) {
            // override this to change Observer's response to
            // input lines
            try {
                var ob = new Observation(JSON.parse(line));
            } catch(e) {
                logger.error(e.stack);
                var ob = new Observation(Observation.TAG_ERROR, e);
            }
            this.inputStream.push(ob);
        }

        streamIn(is) {
            var that = this;
            if (!(is instanceof Readable)) {
                return Promise.reject(new Error(
                    'Expected Readable input stream'));
            }
            is.setEncoding('utf8');
            var started = new Date();
            var pbody = (resolve, reject) => {(async function() { try {
                var remainder = '';
                var bytes = 0;
                var observations = 0;
                var name = `${that.constructor.name}.transform()`;

                is.on('data', (chunk) => {
                    //that.log(`${name} data:${chunk.length}B`);
                    bytes += chunk.length;
                    var lines = (remainder+chunk).split('\n');
                    var n = lines.length-1;
                    for (var i = 0; i < n; i++) {
                        var line = lines[i];
                        that.log(`${name} ${line}`);
                        that.pushLine(line);
                        observations++;
                    }
                    remainder = lines[n] || '';
                });
                is.on('end', () => {
                    try {
                        that.log(`${name} end`);
                        remainder = remainder.trim();
                        if (remainder.length) {
                            that.pushLine(remainder);
                            observations++;
                        }
                        resolve({
                            bytes,
                            observations,
                            started,
                            ended: new Date(),
                        });
                    } catch (err) {
                        that.log(`end() err:${err.message}`);
                        reject(err);
                    }
                });

                is.on('error', (err) => {
                    logger.warn(`${name} ${err.stack}`);
                    reject(err);
                });
            } catch(e) { reject(e); }})()};
            return new Promise(pbody);
        }

        observe(ob) {
            // An observer can process observations:
            //
            // 1. synchronously by returning an observation, or 
            // 2. asynchronously via transform.push(anObservation)
            //
            // The default observer method implements 
            // synchronous pass-through
            return ob; 
        }

        createWritable(obCallback) {
            if (typeof obCallback !== 'function') {
                throw new Error(`Expected observation callback`);
            }
            return new Writable({
                objectMode: true,
                write(ob, encoding, done) {
                    try {
                        obCallback(ob);
                        done();
                    } catch(e) {
                        logger.log(e.stack);
                    }
                }  
            });
        }

        createReadable() {
            var that = this;
            return new Readable({
                objectMode: true,
                read(size) { // called only once 
                    that.log(`input stream is active and reading`);
                },
            });
        }

        pipeline(...args) {
            this.pipelineArgs = args;
            var sargs = args.map(a => a.constructor.name);
            this.log(`| ${sargs.join(' | ')}`);
            var endPoint = this;
            for (var i = 0; i < args.length; i++) {
                var sink = args[i];
                if (sink instanceof Observer) {
                    endPoint.transform.pipe(sink.transform);
                    endPoint = sink;
                } else if (sink instanceof Writable) {
                    endPoint.transform.pipe(sink);
                } else {
                    throw new Error(`Invalid pipeline component#${i}`);
                }
            }
            return this.inputStream;
        }

    }

    module.exports = exports.Observer = Observer;
})(typeof exports === "object" ? exports : (exports = {}));

