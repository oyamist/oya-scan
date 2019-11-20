(function(exports) {
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;
    const {
        Readable,
    } = require('stream');
    const Observer = require('./observer');
    const Observation = require('./observation');

    class Aggregator extends Observer {
        constructor(opts={}) {
            super(opts);
            this.observations = [];
            this.tag = opts.tag;
            this.count = opts.count+'' === 'true';
            this.sum = opts.sum+'' === 'true';
            this.min = opts.min+'' === 'true';
            this.max = opts.max+'' === 'true';
            this.avg = opts.avg+'' === 'true';
            this.stats = {}; 
            this.min && (this.stats.min = Number.MAX_SAFE_INTEGER);
            this.max && (this.stats.max = Number.MIN_SAFE_INTEGER);
            this.sum && (this.stats.sum = 0);
            this.count && (this.stats.count = 0);
            if (this.avg) {
                this.stats.avg = 0; 
                if (!this.count) {
                    Object.defineProperty(this.stats, 'count', {
                        writable: true,
                        value: 0,
                    });
                }
                if (!this.sum) {
                    Object.defineProperty(this.stats, 'sum', {
                        writable: true,
                        value: 0,
                    });
                }
            }
            this.statKeys = Object.keys(this.stats);
            this.collect = opts.collect==null 
                ? this.statKeys.length === 0
                : opts.collect+''==='true';
        }

        observe(ob) {
            var {
                collect,
                stats,
                statKeys,
                sum,
                max,
                min,
                avg,
                count,
                observations,
            } = this;
            if (statKeys.length) {
                (avg || sum) && ( stats.sum += Number(ob.value));
                min && ( stats.min = Math.min(stats.min, Number(ob.value)));
                max && ( stats.max = Math.max(stats.max, Number(ob.value)));
                (avg || count) && ( stats.count++ );
                avg && ( stats.avg = stats.sum / stats.count );
            }

            if (collect) {
                observations.push(ob);
                if (statKeys.length === 0) {
                    return null;
                }
            }

            var tag = this.tag || ob.tag;
            var value = statKeys.length === 1
                ? stats[statKeys[0]]
                : Object.assign({}, stats);
            var type = count || statKeys.length > 1
                ? undefined : ob.type;
            return new Observation(tag, value, type);
        }
    }

    module.exports = exports.Aggregator = Aggregator;
})(typeof exports === "object" ? exports : (exports = {}));
