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

    class ObFilter {
        constructor(opts) {
            var that = this;
            logger.logInstance(that, opts);
            that.readSize = 0;
            Object.defineProperty(that, "pipelineArgs", {
                writable: true,
                value: undefined,
            });
            that.transform = new Transform({
                writableObjectMode: true,
                readableObjectMode: true,
                transform(ob, encoding, cb) {
                    if (ob instanceof Observation) {
                        that.transform.push(that.observe(ob));
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
            if (that._inputStream == null) {
                Object.defineProperty(that, "_inputStream", {
                    value: new Readable({
                        objectMode: true,
                        read(size) { 
                            that.readSize += size; 
                            that.log(`read(${size}/${that.readSize})`);
                        },  
                    }),
                });
                that._inputStream.pipe(that.transform);
            }
            return that._inputStream;
        }

        observe(ob) {
            return ob;
        }

        pipeline(...args) {
            this.pipelineArgs = args;
            var sargs = args.map(a => a.constructor.name);
            this.log(`| ${sargs.join(' | ')}`);
            var endPoint = this;
            for (var i = 0; i < args.length; i++) {
                var sink = args[i];
                if (sink instanceof ObFilter) {
                    endPoint.transform.pipe(sink.transform);
                    endPoint = sink;
                } else {
                    endPoint.transform.pipe(sink);
                }
            }
            return this.inputStream;
        }

    }

    module.exports = exports.ObFilter = ObFilter;
})(typeof exports === "object" ? exports : (exports = {}));

