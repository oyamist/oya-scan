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

    class Pipeline {
        constructor(opts={}) {
            logger.logInstance(this, opts);
            this.observers = [];
        }

        static Stringify(os) {
            var transform = new Transform({
                writableObjectMode: true,
                readableObjectMode: false,
                transform(ob, encoding, cb) {
                    var json = JSON.stringify(ob);
                    transform.push(json);
                    cb();
                }
            });
            os && transform.pipe(os);
            return transform;
        }

        static Format(fmt, os) {
            var format = typeof fmt === 'function' 
                ? fmt
                : (ob => {
                    var s = fmt.replace('${tag}', ob.tag)
                        .replace('${value}', ob.value);
                    return ob.type === undefined
                        ? s.replace('${type}', '')
                        : s.replace('${type}', ob.type);
                })
            var transform = new Transform({
                writableObjectMode: true,
                readableObjectMode: false,
                transform(ob, encoding, cb) {
                    var text = format(ob);
                    transform.push(text);
                    cb();
                }
            });
            os && transform.pipe(os);
            return transform;
        }

        build(...args) {
            var that = this;
            var pbody = (resolve,reject) => { try {
                var {
                    observers,
                } = this;
                if (observers.length) {
                    throw new Error(`build() can only be called once`);
                }
                var sargs = args.map(a => a.constructor.name);
                var endPoint;
                var i = 0;
                var iEnd = args.length-1;
                if (args[i] instanceof Readable) {
                    that.log(`[${i}] Readable input stream`);
                    that.inputStream = args[i];
                    i++;
                }
                for (; i <= iEnd; i++) {
                    var arg = args[i];
                    if (arg instanceof Observer) {
                        endPoint && endPoint.transform.pipe(arg.transform);
                        endPoint = arg;
                        observers.push(arg);
                        that.log(`[${i}] ${arg.name}`);
                    } else if (i === iEnd) {
                        if (arg instanceof Writable) {
                            if (arg._writableState.objectMode) {
                                endPoint.transform.pipe(arg);
                                that.outputStream = arg;
                                that.log(`[${i}] Writable object stream`);
                            } else {
                                var outTrans = Pipeline.Stringify(arg);
                                endPoint.transform.pipe(outTrans);
                                that.log(`[${i}] Stringify stream`);
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

                if (this.inputStream) {
                    this.inputPromise = 
                        observers[0].streamIn(this.inputStream);
                }

                resolve(this);
            } catch(e) { reject(e); } };
            return new Promise(pbody);
        }

    }

    module.exports = exports.Pipeline = Pipeline;
})(typeof exports === "object" ? exports : (exports = {}));

