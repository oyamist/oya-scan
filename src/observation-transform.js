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

            that.transform = new Transform({
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
            });
        }

        observe(ob) {
            return ob;
        }
    }

    module.exports = exports.ObservationTransform = ObservationTransform;
})(typeof exports === "object" ? exports : (exports = {}));

