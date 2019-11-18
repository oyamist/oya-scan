(function(exports) {
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;
    const {
        Readable,
        Transform,
    } = require('stream');
    const Observer = require('./observer');
    const Observation = require('./observation');
    var instCount = 0;

    /*
     * Sources provide observations to downstream observers
     */
    class Source {
        constructor(opts={}) {
            //super(opts);
            var that = this;
            logger.logInstance(that, opts);
            this.name = opts.name || 
                `${this.constructor.name}-${instCount++}`;
            that.obsCount = 0;

            var objectSink = new Readable({
                objectMode: true,
                read(size) { // called only once 
                    that.log(`read() initialized`);
                },
            });
            Object.defineProperty(this, "_objectSink", {
                value: objectSink,
            });
            this.transform = new Transform({
                writableObjectMode: true,
                readableObjectMode: true,
                transform(ob, encoding, cb) {
                    if (ob instanceof Observation) {
                        that.obsCount++;
                        that.transform.push(ob);
                    } else {
                        that.transform.push(
                            new Error('expected Observation')
                        );
                    }
                    cb();
                }
            });
            objectSink.pipe(this.transform);

            this.observations = opts.observations;
            this.lineStream = opts.lineStream;

            this.initialized = false;
        }

        onInitialize() {
            this.started = new Date();
            if (this.observations) {
                var observations = this.observations;
                observations.forEach(o => this._objectSink.push(o));
            } else if (this.lineStream) {
                this.streamInLine(this.lineStream);
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
            this.log(`Source streamIn(LineStream)`);
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

            return is._readableState.objectMode
                ? that.streamInObjects(is)
                : that.streamInLines(is);
        }

    }

    module.exports = exports.Source = Source;
})(typeof exports === "object" ? exports : (exports = {}));

