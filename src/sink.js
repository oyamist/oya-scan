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

    class Sink extends Observer {
        constructor(opts) {
            super((opts = Sink.options(opts)));
            this.observationToString = opts.observationToString;
            this.outputStream = opts.outputStream;
            this.eol = opts.eol;
        }

        static options(opts={}) {
            var {
                observationToString,
                outputStream,
                eol,
            } = opts;
            if (observationToString == null) {
                observationToString = (ob) => JSON.stringify(ob);
            }
            eol = eol === undefined ? '\n' : eol;
            var transform = opts.transform || new Transform({
                writableObjectMode: true,
                readableObjectMode: false,
                transform(ob, encoding, cb) {
                    var text = observationToString(ob);
                    if (outputStream) {
                        transform.push(text);
                        eol && transform.push(eol);
                    }
                    cb();
                }
            });

            return Object.assign({}, opts, {
                observationToString,
                transform,
                eol,
            });
        }

        onInitialize(resolve, reject) {
            var {
                outputStream,
                transform,
            } = this;
            if (outputStream) {
                this.log(`${this.name} outputStream connected`);
                transform.pipe(outputStream);
            }
            super.onInitialize(resolve, reject);
        }

    }

    module.exports = exports.Sink = Sink;
})(typeof exports === "object" ? exports : (exports = {}));

