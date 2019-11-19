(function(exports) {
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;
    const {
        Readable,
    } = require('stream');
    const Observation = require('./observation');
    const ObservationTransform = require('./observation-transform');
    var instCount = 0;

    /*
     * Sources provide observations to downstream observers
     */
    class Source extends ObservationTransform {
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
                this.log(`Created observations Source`);
            } else if (opts.lineStream) {
                this.lineStream = opts.lineStream;
                this.log(`Created lineStream Source`);
            } else {
                this.log(`Created objectsIn Source`);
            }

            this.initialized = false;
        }

        onInitialize() {
            this.started = new Date();
            if (this.observations) {
                var observations = this.observations;
                observations.forEach(o => this.objectsIn.push(o));
                this.log(`Source observations initialized`);
            } else if (this.lineStream) {
                this.streamInLine(this.lineStream);
                this.log(`Source lineStream initialized`);
            } else {
                this.log(`Source objectsIn initialized`);
            }

            this.initalized = true;
        }

        initialize() {
            // Subclass can do whatever here
            this.onInitialize();
            return Promise.resolve(this);
        }

        streamInLines(is) {
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

