(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const LOCAL = path.join(__dirname, '../local');
    const GuidStore = require('./guid-store');
    const Scanner = require('./scanner');
    const Observation = require('./observation');
    const Thing = require('./thing');
    const INDEXFILE = "index.json";
    const VERSION = "1";

    class Workspace extends GuidStore {
        constructor(opts) {
            super(Workspace.options(opts));
            var indexPath = this.indexPath = path.join(this.storePath, INDEXFILE);
            if (fs.existsSync(this.indexPath)) {
                this.index = JSON.parse(fs.readFileSync(this.indexPath));
            } else {
                var index = this.index = {
                    type: this.constructor.name,
                    version: VERSION,
                    scannerMap: {},
                };
                this.sync();
            }

            this.scanner = new Scanner({
                map: this,
            });
        }

        static options(opts={}) {
            return opts;
        }

        sync() {
            fs.writeFileSync(this.indexPath, 
                JSON.stringify(this.index, null, 2));
        }

        thingOfGuid(guid) {
            var thingPath = this.guidPath(guid, '.json');
            if (!fs.existsSync(thingPath)) {
                return null;
            }
            var json = fs.readFileSync(thingPath);
            return new Thing(JSON.parse(json));
        }

        createBarcodeThing(barcode) {
            var {
                scannerMap,
            } = this.index;

            // create thing for barcode 
            var thing = new Thing({
                barcode,
            });
            var thingPath = this.guidPath(thing.guid, '.json');
            fs.writeFileSync(thingPath, JSON.stringify(thing, null, 2));

            // bind barcode to thing
            var ob = {
                tag: thing.type,
                value: thing.guid,
            };
            scannerMap[barcode] = ob;
            this.sync();

            return ob;
        }

        map(barcode) {
            var {
                scannerMap,
            } = this.index;
            var ob = scannerMap[barcode];
            ob = ob || this.createBarcodeThing(barcode);

            return ob;
        }

    }

    module.exports = exports.Workspace = Workspace;
})(typeof exports === "object" ? exports : (exports = {}));

