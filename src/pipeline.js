(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        Readable,
        Writable,
    } = require('stream');
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;
    const Observer = require('./observer');

    class Pipeline {
        constructor(opts={}) {
            logger.logInstance(this, opts);
            this.observers = [];
        }

        build(...args) {
            var {
                observers,
            } = this;
            if (observers.length) {
                throw new Error(`build() can only be called once`);
            }
            var sargs = args.map(a => a.constructor.name);
            var endPoint;
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (arg instanceof Observer) {
                    endPoint && endPoint.transform.pipe(arg.transform);
                    endPoint = arg;
                    observers.push(arg);
                    this.log(`[${i}] ${arg.name}`);
                } else if (arg instanceof Readable) {
                    if (i !== 0) {
                        throw new Error(
                            `Readable must precede pipeline Observers`);
                    }
                    this.inputStream = arg;
                    this.log(`[${i}] Readable input stream`);
                } else if (arg instanceof Writable) {
                    if (endPoint == null) {
                        throw new Error(
                            `Observers must precede pipeline Writable`);
                    }
                    endPoint.transform.pipe(arg);
                    this.outputStream = arg;
                    this.log(`[${i}] Writable output stream`);
                } else {
                    throw new Error(`Invalid pipeline component#${i}`);
                }
            }

            if (this.inputStream) {
                this.inputPromise = observers[0].streamIn(this.inputStream);
            }

            return this;
        }

    }

    module.exports = exports.Pipeline = Pipeline;
})(typeof exports === "object" ? exports : (exports = {}));

