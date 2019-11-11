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
        constructor(opts={}) {
            var that = this;
            logger.logInstance(that, opts);
            that.name = opts.name || this.constructor.name;
            that.readSize = 0;
            Object.defineProperty(that, "pipelineArgs", {
                writable: true,
                value: undefined,
            });
            Object.defineProperty(that, "_inputStream", {
                writable: true,
                value: null,
            });
            that.transform = new Transform({
                writableObjectMode: true,
                readableObjectMode: true,
                transform(ob, encoding, cb) {
                    if (ob instanceof Observation) {
                        var obResult = that.observe(ob);
                        obResult && that.transform.push(obResult);
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
            return that._inputStream;
        }

        streamIn(is) {
            var that = this;
            if (!(is instanceof Readable)) {
                throw new Error(
                    'Expected Readable input stream');
            }
            if (that._inputStream != null) {
                throw new Error(
                    `Input stream has already been assigned`);
            }
            if (is._readableState.objectMode) {
                // Observation stream
                that._inputStream = is;
                that._inputStream.pipe(that.transform);
                return new Promise((resolve,reject) => { try {
                    var started = new Date();
                    var bytes = 0;
                    var observations = 0;
                    that.log(`TBD streamIn(ObservationStream)`);
                    resolve({
                        bytes,
                        observations,
                        started,
                        ended: new Date(),
                    });
                } catch(e) { reject(e); }});
            }

            // standard line stream (e.g., stdin)
            this.log(`streamIn(LineStream)`);
            this._inputStream = that.createReadable();
            that._inputStream.pipe(that.transform);
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

        pushLine(line) {
            // override this to change Observer's response to
            // input lines
            try {
                var ob = new Observation(JSON.parse(line));
            } catch(e) {
                logger.error(e.stack);
                var ob = new Observation(Observation.TAG_ERROR, e);
            }
            if (this.inputStream == null) {
                throw new Error(
                    `No input stream. Call streamIn() or pipeline()`);
            }
            this.inputStream.push(ob);
        }

        observe(ob) {
            // An observer can process observations:
            //
            // 1. synchronously by returning an observation, or 
            // 2. asynchronously via transform.push(anObservation)
            //
            // The default observer method implements 
            // synchronous pass-through
            this.log(`observe(${js.simpleString(ob)})`);
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
                    that.log(`read() initialized`);
                },
            });
        }

    }

    module.exports = exports.Observer = Observer;
})(typeof exports === "object" ? exports : (exports = {}));

