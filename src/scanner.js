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
    const {
        exec,
    } = require('child_process');
    const Observation = require('./observation');
    const LineFilter = require('./line-filter');
    const TAG_SCANNED = "scanned";
    const TAG_CODE128 = "CODE128";
    const TAG_UPCA = "UPC-A";
    const TAG_EAN13 = "EAN13";
    const TAG_UPCE_EAN8 = "UPC-E/EAN-8";
    const PAT_UPCA = '[0-9]{12,12}'; 
    const PAT_EAN13 = '[0-9]{13,13}'; 
    const PAT_UPCE_EAN8 = '[0-9]{8,8}'; // UPC-E or EAN-8
    const PAT_NUMBER = '-?('+[
        '[0-9]{0,7}', // integer
        '[0-9]{0,6}\\.[0-9]', // floating point
        '[0-9]{0,5}\\.[0-9]{0,2}', // floating point
        '[0-9]{0,4}\\.[0-9]{0,3}', // floating point
    ].join('|')+')';

    class Scanner {
        static get MATCH_NUMBER() { return {
                re: PAT_NUMBER,
                value: 'number',
            };
        }
        static get MATCH_UPCE_EAN8() { return {
                re: PAT_UPCE_EAN8,
                value: TAG_UPCE_EAN8,
            };
        }
        static get MATCH_EAN13() { return {
                re: PAT_EAN13,
                value: TAG_EAN13,
            };
        }
        static get MATCH_UPCA() { return {
                re: PAT_UPCA,
                value: TAG_UPCA,
            };
        }

        constructor(opts = {}) {
            this.map = opts.map || {};
            this.tag = opts.tag || TAG_SCANNED;  // default tag
            var patterns = opts.patterns || [];
            logger.logInstance(this, opts);
            this.patterns = patterns.map(p => {
                var re = p.re instanceof RegExp
                    ? p.re : RegExp(`^${p.re}$`);
                return {
                    re,
                    value: p.value,
                }
            });
        }

        static get TAG_EAN13() { return TAG_EAN13; }
        static get TAG_UPCA() { return TAG_UPCA; }
        static get TAG_UPCE_EAN8() { return TAG_UPCE_EAN8; }
        static get TAG_NUMBER() { return "number"; }
        static get TAG_SCANNED() { return TAG_SCANNED; }

        scan(barcode) {
            var t = new Date();
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
            var value = barcode;
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

        transform(is,os) {
            var consume = (line, os) => {
                var odata = this.scan(line);
                os.write(JSON.stringify(odata)+'\n');
            };
            var lf = new LineFilter({
                logLevel: this.logLevel,
                consume,
            });

            return lf.transform(is, os);
        }
    }

    module.exports = exports.Scanner = Scanner;
})(typeof exports === "object" ? exports : (exports = {}));

