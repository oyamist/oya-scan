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

        assetOfGuid(guid) {
            var assetPath = this.guidPath(guid, '.json');
            if (!fs.existsSync(assetPath)) {
                return null;
            }
            var json = fs.readFileSync(assetPath);
            return new Asset(JSON.parse(json));
        }

        map(barcode) {
            var {
                scannerMap,
            } = this.index;
            var ob = scannerMap[barcode];
            if (!ob) { 
                // create asset for barcode 
                var asset = new Asset({
                    barcode,
                });
                var assetPath = this.guidPath(asset.guid, '.json');
                fs.writeFileSync(assetPath, JSON.stringify(asset, null, 2));

                // bind barcode to asset
                ob = {
                    tag: asset.type,
                    value: asset.guid,
                };
                scannerMap[barcode] = ob;
                this.sync();
            }

            return ob;
        }

    }

    module.exports = exports.Workspace = Workspace;
})(typeof exports === "object" ? exports : (exports = {}));

