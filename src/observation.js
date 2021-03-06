(function(exports) {
    const uuidv4 = require("uuid/v4");
    const js = require('just-simple').JustSimple.js;

    class Observation {
        constructor(...args) {
            if (typeof args[0] === 'string') {
                var opts = {};
                args[0] !== undefined && (opts.tag = args[0]);
                args[1] !== undefined && (opts.value = args[1]);
                args[2] != null && (opts.type = args[2]);
                args[3] !== undefined && (opts.t = args[3]);
            } else {
                var opts = args[0] || {};
            }
            if (opts.hasOwnProperty('t')) {
                this.t = new Date(opts.t);
            } else {
                this.t = new Date();
            }
            if (opts.hasOwnProperty('tag')) {
                if (typeof opts.tag !== 'string') {
                    throw new Error(`Invalid tag:${opts.tag}`);
                }
                this.tag = opts.tag;
            }
            if (opts.hasOwnProperty('value')) {
                this.value = opts.value;
            } else {
                this.value = this.t;
            }
            if (opts.hasOwnProperty('type')) {
                this.type = opts.type;
            }
        }

        static get TAG_ERROR() { return 'error'; }
        static get TIME_RESOLUTION_MS() { return 2; }
        static get RETROACTIVE() { 
            return new Date(-8640000000000000); // Javascript minimum date
        }

        static compareTime(a,b) {
            if (a.t < b.t) {
                return -1;
            }
            return  (a.t === b.t) ? 0 : 1;
        }
        static compare_t_tag(a,b) {
            if (a.t.getTime() === b.t.getTime()) {
                if (a.tag === b.tag) {
                    return 0;
                }
                return a.tag < b.tag ? -1 : 1;
            }
            return a.t.getTime() < b.t.getTime() ? -1 : 1;
        }

        static isEvent(tv) {
            return tv.value === Observation.V_EVENT;
        }

        static mergeObservations(tv1, tv2) {
            // Choose longest sequence as most valid
            (tv1.length < tv2.length) && ([tv1,tv2] = [tv2, tv1]);
            tv1 = tv1.map(tv=>tv).sort(Observation.compare_t_tag);
            tv2 = tv2.map(tv=>tv).sort(Observation.compare_t_tag);
            var merged = [];
            while (tv2.length && tv1.length) {
                var cmp = Observation.compare_t_tag(tv1[0], tv2[0]);
                if (cmp < 0) {
                    merged.push(tv1.shift());
                } else if (cmp === 0) {
                    merged.push(tv1.shift()); // tv1 has priority
                    tv2.shift(); // discard
                } else {
                    merged.push(tv2.shift());
                }
            }
            tv1.length && (merged = merged.concat(tv1));
            tv2.length && (merged = merged.concat(tv2));
            return merged;
        }

        toString() {
            var {
                tag,
                value,
                type,
            } = this;
            value = js.simpleString(value);
            return type 
                ?  `${tag}:${value} ${type}`
                :  `${tag}:${value}`;
        }

    } // class Observation

    module.exports = exports.Observation = Observation;
})(typeof exports === "object" ? exports : (exports = {}));

