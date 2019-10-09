(function(exports) {
    const {
        Readable,
        Writable,
    } = require('stream');
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;

    class LineFilter {
        constructor(opts = {}) {
            this.consume = opts.consume || this.passThrough;
            logger.logInstance(this, Object.assign({
                logLevel: false,
            }, opts));
        }

        passThrough(line, os) { // default implementation
            this.log(line);
            os.write(line+'\n');
        }

        transform(is, os) {
            if (!(is instanceof Readable)) {
                return Promise.reject(new Error(
                    'Expected Readable input stream'));
            }
            if (!(os instanceof Writable)) {
                return Promise.reject(new Error(
                    'Expected Writable output stream'));
            }
            is.setEncoding('utf8');
            var started = new Date();
            return new Promise((resolve, reject) => {
                var remainder = '';
                var that = this;
                var bytes = 0;
                var observations = 0;
                var name = `${this.constructor.name}.transform()`;

                is.on('data', (chunk) => {
                    //this.log(`${name} data:${chunk.length}B`);
                    bytes += chunk.length;
                    var lines = (remainder+chunk).split('\n');
                    var n = lines.length-1;
                    for (var i = 0; i < n; i++) {
                        var line = lines[i];
                        this.log(`${name} ${line}`);
                        that.consume(line, os);
                        observations++;
                    }
                    remainder = lines[n] || '';
                });
                is.on('end', () => {
                    try {
                        this.log(`${name} end`);
                        remainder = remainder.trim();
                        if (remainder.length) {
                            that.consume(remainder, os);
                            observations++;
                        }
                        //os.end();
                        resolve({
                            bytes,
                            observations,
                            started,
                            ended: new Date(),
                        });
                    } catch (err) {
                      os.end(`error: ${err.message}`);
                      reject(err);
                    }
                });

                is.on('error', (err) => {
                    logger.warn(`${name} ${err.stack}`);
                    reject(err);
                });
            });
        }
    }

    module.exports = exports.LineFilter = LineFilter;
})(typeof exports === "object" ? exports : (exports = {}));

