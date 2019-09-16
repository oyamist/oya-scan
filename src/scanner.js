
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
    class Scanner {
        constructor(opts = {}) {
            this.map = opts.map || {};
            this.tag = opts.tag || "scanned";  // default tag
        }

        scan(data) {
            var t = new Date();
            var barcode = data.trim();
            var m = typeof this.map === 'function' 
                ? this.map(barcode)
                : this.map[barcode];
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

