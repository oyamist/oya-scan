(function(exports) {
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;
    const {
        Transform,
    } = require('stream');
    const Observation = require('./observation');
    var instCount = 0;

    class ObservationTransform { // abstract superclass
        constructor(opts={}) {
            var that = this;
            logger.logInstance(that, opts);
            that.name = opts.name || 
                `${that.constructor.name}${instCount++}`;
            that.obsCount = 0;
            Object.defineProperty(that, 'initError', {
                value: new Error(
                    `${that.name}.initialize() must be called before use`),
            });

            Object.defineProperty(that, 'transform', {
                value: new Transform({
                    writableObjectMode: true,
                    readableObjectMode: true,
                    transform(ob, encoding, cb) {
                        if (ob instanceof Observation) {
                            let obResult = that.observe(ob);
                            if (obResult) { 
                                that.obsCount++;
                                that.transform.push(obResult);
                            }
                        } else {
                            that.transform.push(
                                new Error('expected Observation')
                            );
                        }
                        cb();
                    }
                }),
            });
            that.initialized = false;
        }

        onInitialize(resolve, reject) {
            var that = this;
            (async function() { try {
                that.initialized = null;
                that.log(`initializing`);
                that.initialized = true;
                resolve(that);
            } catch(e) {reject(e);}})();
        }

        initialize() {
            if (this.initialized === false) {
                var that = this;
                return new Promise((resolve, reject)=>
                    that.onInitialize(resolve,reject)
                );
            }
            return Promise.resolve(this);
        }

        assertInitialized() {
            if (this.initialized === false) {
                var name = this.name;
                throw this.initError;
            }
        }

        observe(ob) {
            this.assertInitialized();
            return ob;
        }
    }

    module.exports = exports.ObservationTransform = ObservationTransform;
})(typeof exports === "object" ? exports : (exports = {}));

