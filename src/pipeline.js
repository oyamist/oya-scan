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
    const Observer = require('./observer');
    const Source = require('./source');
    const Sink = require('./sink');

    class Pipeline {
        constructor(opts={}) {
            logger.logInstance(this, opts);
            this.observers = [];
        }

        build(...args) {
            var that = this;
            var {
                logLevel,
                observers,
            } = this;
            var pbody = (resolve,reject) => (async function() {try{
                if (observers.length) {
                    throw new Error(`build() can only be called once`);
                }
                var sargs = args.map(a => a.constructor.name);
                var endPoint;
                var i = 0;
                var iEnd = args.length-1;
                if (args[i] instanceof Readable) {
                    endPoint = new Source({
                        logLevel,
                        inputStream: args[i],
                    });
                    observers.push(endPoint);
                    that.log(`build() [${i}] ${endPoint.name} inputStream`);
                    i++;
                } else if (args[i] instanceof Source) {
                    endPoint = args[i];
                    observers.push(args[i]);
                    that.log(`build() [${i}] ${args[i].name}`);
                    i++;
                }
                for (; i <= iEnd; i++) {
                    var arg = args[i];
                    if (arg instanceof Observer) {
                        endPoint && endPoint.transform.pipe(arg.transform);
                        endPoint = arg;
                        observers.push(arg);
                        that.log(`build() [${i}] ${arg.name}`);
                    } else if (i === iEnd) {
                        if (arg instanceof Writable) {
                            if (arg._writableState.objectMode) {
                                endPoint.transform.pipe(arg);
                                that.outputStream = arg;
                                that.log(`build() [${i}] `+
                                    `Writable object stream`);
                            } else {
                                var sink = new Sink({
                                    logLevel,
                                    outputStream: arg,
                                });
                                endPoint.transform.pipe(sink);
                                observers.push(sink);
                                that.log(`build() [${i}] Stringify stream`);
                            }
                        } else {
                            throw new Error(`Expected Observer `+
                                `or Writable at end of Pipeline`);
                        }
                    } else {
                        throw new Error(`args[${i}] `+
                            `${arg.constructor.name} must be a `+
                            `Readable, Observer, or Writable`);
                    }
                }

                for (var iOvr=0; iOvr < observers.length; iOvr++) {
                    await observers[iOvr].initialize();
                }

                resolve(that);
            } catch(e) { reject(e); }})();
            return new Promise(pbody);
        }

    }

    module.exports = exports.Pipeline = Pipeline;
})(typeof exports === "object" ? exports : (exports = {}));

