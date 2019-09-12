
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
            this.map = Object.assign({}, opts.map);
            this.tag = opts.tag || "scanned";  // default tag
        }

        scan(data) {
            var t = new Date();
            var m = this.map[data.trim()];
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
    }

    module.exports = exports.Scanner = Scanner;
})(typeof exports === "object" ? exports : (exports = {}));

