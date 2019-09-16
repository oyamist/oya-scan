(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const LOCAL = path.join(__dirname, '../local');
    const GuidStore = require('./guid-store');
    const Scanner = require('./scanner');
    const Asset = require('./asset');
    const INDEXFILE = "index.json";
    const VERSION = "1";

    class Workspace extends GuidStore {
        constructor(opts) {
            super(Workspace.options(opts));
            this.indexPath = path.join(this.storePath, INDEXFILE);
            if (fs.existsSync(this.indexPath)) {
                this.index = JSON.parse(fs.readFileSync(this.indexPath));
            } else {
                this.index = {
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

        map(barcode) {
            var value = this.scannerMap[barcode];
            if (!value) {
                value = new Asset({
                    barcode,
                });
            }

            return value;
        }

    }

    module.exports = exports.Workspace = Workspace;
})(typeof exports === "object" ? exports : (exports = {}));

