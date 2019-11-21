(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;
    const {
        Readable,
    } = require('stream');
    const Observation = require('./observation');
    const Observer = require('./observer');
    var instCount = 0;

    /*
     * Sources provide observations to downstream observers
     */
    class Source extends Observer {
        constructor(opts={}) {
            super(opts);
            var that = this;

            var objectsIn = new Readable({
                objectMode: true,
                read(size) { // called only once 
                    that.log(`read() initialized`);
                },
            });
            Object.defineProperty(this, "objectsIn", {
                value: objectsIn,
            });
            objectsIn.pipe(this.transform);

            if (opts.observations) {
                this.observations = opts.observations;
                if (opts.lineStream) {
                    throw new Error(
                        `lineStream not allowed with observations`);
                }
                var nObs = this.observations.length;
                this.log(`ctor: observations[${nObs}]`);
            } else if (opts.lineStream) {
                this.lineStream = typeof opts.lineStream === 'string'
                    ? fs.createReadStream(opts.lineStream)
                    : opts.lineStream;
                this.log(`ctor: lineStream`);
            } else {
                this.log(`ctor: objectsIn`);
            }
        }

        onInitialize(resolve,reject) {
            var that = this;
            (async function() { try {
                that.initialized = null;
                var {
                    observations,
                    objectsIn,
                } = that;
                that.started = new Date();
                if (observations) {
                    var nObs = observations.length;
                    observations.forEach(o => objectsIn.push(o));
                    objectsIn.push(null); // EOS
                    that.log(`observations[${nObs}] initialized`);
                } else if (that.lineStream) {
                    await that.streamInLines(that.lineStream);
                    that.log(`lineStream initialized`);
                } else {
                    that.log(`objectsIn initialized`);
                }

                that.initialized = true;
                resolve(that);
            } catch(e) { reject(e); }})();
        }

        streamInLines(is) {
            var that = this;
            if (is._readableState.objectMode) {
                throw new Error(
                    `Line input stream cannot be object stream`);
            }

            // standard line stream (e.g., stdin)
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

        /*
         * By default, convert lines to observations
         */
        pushLine(line) {
            try {
                var ob = new Observation(JSON.parse(line));
            } catch(e) {
                logger.error(e.stack);
                var ob = new Observation(Observation.TAG_ERROR, e);
            }
            this.objectsIn.push(ob);
        }

    }

    module.exports = exports.Source = Source;
})(typeof exports === "object" ? exports : (exports = {}));

