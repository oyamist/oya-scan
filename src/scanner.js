
(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        Readable,
        Writable,
    } = require('stream');
    const {
        logger,
    } = require('rest-bundle');
    const {
        exec,
    } = require('child_process');
    const Observation = require('./observation');
    const TAG_SCANNED = "scanned";
    const PAT_NUMBER = '-?[0-9]+(\\.[0-9]+)?';

    class Scanner {
        constructor(opts = {}) {
            this.map = opts.map || {};
            this.tag = opts.tag || TAG_SCANNED;  // default tag
            var patterns = opts.patterns || [{
                re: PAT_NUMBER,
                value: 'number',
            }];
            this.patterns = patterns.map(p => ({
                re: new RegExp(`^${p.re}$`),
                value: p.value,
            }));
        }

        static get TAG_NUMBER() { return "number"; }
        static get TAG_SCANNED() { return TAG_SCANNED; }

        scan(data) {
            var t = new Date();
            var barcode = data.trim();
            for (var i = 0; i < this.patterns.length; i++) {
                var p = this.patterns[i];
                if (p.re.test(barcode)) {
                    if (p.value === 'number') {
                        return new Observation(p.value, Number(barcode)); 
                    } else if (typeof p.value === 'string') {
                        return new Observation(p.value, barcode);
                    } else {
                        return p.value;
                    }
                }
            }

            var mapper = this.map;
            var mapperType = typeof mapper.map;
            if (mapper && (mapperType === 'function')) {
                var m = mapper.map(barcode);
            } else {
                var m = mapper[barcode];
            }
            var value = data;
            var tag = this.tag;
            if (m) {
                value = m.value;
                tag = m.tag || this.tag;
            }

            return new Observation({
                t,
                tag,
                value,
            });
        }

        transform(is, os) {
            if (!(is instanceof Readable)) {
                return Promise.reject(new Error('Expected Readable input stream'));
            }
            if (!(os instanceof Writable)) {
                return Promise.reject(new Error('Expected Writable output stream'));
            }
            var started = new Date();
            return new Promise((resolve, reject) => {
                is.setEncoding('utf8');
                var remainder = '';
                var that = this;
                var bytes = 0;
                var observations = 0;

                is.on('data', (chunk) => {
                    bytes += chunk.length;
                    var lines = (remainder+chunk).split('\n');
                    var n = lines.length-1;
                    for (var i = 0; i < n; i++) {
                        var odata = that.scan(lines[i]);
                        os.write(JSON.stringify(odata)+'\n');
                        observations++;
                    }
                    remainder = lines[n] || '';
                });
                is.on('end', () => {
                    try {
                        remainder = remainder.trim();
                        if (remainder.length) {
                            var odata = that.scan(remainder);
                            os.write(JSON.stringify(odata)+'\n');
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
                    reject(err);
                });

            });
        }
    }

    module.exports = exports.Scanner = Scanner;
})(typeof exports === "object" ? exports : (exports = {}));

