(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const { 
        logger,
        LOCAL_DIR,
    } = require('just-simple').JustSimple;

    class GuidStore {
        constructor(opts={}) {
            logger.logInstance(this, opts);
            this.type = opts.type || this.constructor.name;
            this.folderPrefix = opts.folderPrefix || 2;
            this.storeDir = opts.storeDir || LOCAL_DIR;
            if (!fs.existsSync(this.storeDir)) {
                fs.mkdirSync(this.storeDir);
            }

            this.suffix = opts.suffix || '';
            this.volume = opts.volume || 'common';
            this.name = opts.name;
            if (this.name == null) {
                var nameLower = this.type.toLocaleLowerCase();
                var name = '';
                for (var i = 0; i < nameLower.length; i++) {
                    var c = nameLower.charAt(i);
                    if (i && this.type.charAt(i) !== c) {
                        name += '-';
                    }
                    name += c;
                }
                this.name = name;
            }

            // Unserialized properties
            var storePath = opts.storePath || 
                path.join(this.storeDir, this.name);
            Object.defineProperty(this, 'storePath', {value: storePath});
            fs.existsSync(this.storePath) || fs.mkdirSync(this.storePath);
            this.log(`${this.storePath}`);
        }

        guidPath(...args) {
            if (args[0] === Object(args[0])) { // (opts); (opts1,opts2)
                var opts = Object.assign({}, args[0], args[1]);
            } else if (args[1] === Object(args[1])) { // (guid, opts)
                var opts = Object.assign({
                    guid: args[0],
                }, args[1]);
            } else { // (guid, suffix)
                var opts = {
                    guid: args[0],
                    suffix: args[1],
                };
            }

            // set up volume folder
            var volume = opts.volume || this.volume;
            var volumePath = path.join(this.storePath, volume);
            fs.existsSync(volumePath) || fs.mkdirSync(volumePath);

            // set up chapter folder
            var guid = opts.guid;
            var chapter = opts.chapter || guid.substr(0,this.folderPrefix);
            var chapterPath = path.join(this.storePath, volume, chapter);
            fs.existsSync(chapterPath) || fs.mkdirSync(chapterPath);

            // define path
            var suffix = opts.suffix == null ? this.suffix : opts.suffix;
            return path.join(chapterPath, `${guid}${suffix}`);
        }

        signaturePath(sigObj, opts) {
            var guidOpts = Object.assign({}, sigObj);
            if (opts === Object(opts)) {
                Object.assign(guidOpts, opts);
            } else if (typeof opts === 'string') {
                guidOpts.suffix = opts;
            }
            return this.guidPath(guidOpts);
        }

    }

    module.exports = exports.GuidStore = GuidStore;
})(typeof exports === "object" ? exports : (exports = {}));

