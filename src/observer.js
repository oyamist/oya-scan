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
    const ObTransform = require('./ob-transform');

    class Observer extends ObTransform {
        constructor(opts={}) {
            super(opts);
            var that = this;
            that.readSize = 0;
            Object.defineProperty(that, "pipelineArgs", {
                writable: true,
                value: undefined,
            });
            Object.defineProperty(that, "_objectsIn", {
                writable: true,
                value: null,
            });
        }

        get objectsIn() {
            var that = this;
            return that._objectsIn;
        }

        streamInObjects(is) {
            var that = this;

            // Observation stream
            that._objectsIn = is;
            that._objectsIn.pipe(that.transform);
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

        streamIn(is) {
            var that = this;
            if (!(is instanceof Readable)) {
                throw new Error(
                    'Expected Readable input stream');
            }
            if (that._objectsIn != null) {
                throw new Error(
                    `Input stream has already been assigned`);
            }

            return is._readableState.objectMode
                ? that.streamInObjects(is)
                : that.streamInLines(is);
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
            if (this.objectsIn == null) {
                throw new Error(
                    `No input stream. Call streamIn() or pipeline()`);
            }
            this.objectsIn.push(ob);
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

