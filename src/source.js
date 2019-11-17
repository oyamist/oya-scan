(function(exports) {
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;
    const {
        Readable,
    } = require('stream');
    const Observer = require('./observer');

    /*
     * Sources provide observations to downstream observers
     */
    class Source extends Observer {
        constructor(opts={}) {
            super(opts);
            var that = this;
            that.streamIn(new Readable({
                objectMode: true,
                read(size) { // called only once 
                    that.log(`read() initialized`);
                },
            }));

            this.observations = opts.observations;

            this.initialized = false;
        }

        onInitialize() {
            if (this.observations) {
                var observations = this.observations;
                observations.forEach(o => this.inputStream.push(o));
            }

            this.initalized = true;
        }

        initialize() {
            // Subclass can do whatever here
            this.onInitialize();
            return Promise.resolve(this);
        }

    }

    module.exports = exports.Source = Source;
})(typeof exports === "object" ? exports : (exports = {}));

