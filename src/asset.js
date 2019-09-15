(function(exports) {
    const uuidv4 = require("uuid/v4");
    const Observation = require('./observation');
    const MSDAYS = 24*3600*1000;
    const SHORT_GUID_DIGITS = 7; // same as git default
    const ISODATE = /^\d\d\d\d-\d\d-\d\d/;
    const JSON_DATE = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d/;
    
    // Assets have different kinds of properties:
    // * immutable non-temporal properties (e.g., guid) 
    // * mutable non-temporal properties (e.g., cultivar) 
    // * standard temporal properties (e.g., pollinated) are undefined till set
    // * retroactive temporal properties (e.g., id) have values that predate their creation

    class Asset {
        constructor(opts = {}) {
            // core properties
            this.guid = opts.guid || this.guid || uuidv4();
            this.type = this.constructor.name;
            Object.defineProperty(this, "obs", {
                enumerable: true,
                writable: true,
                value: (opts.obs || []).map(ob =>
                    (ob instanceof Observation ? ob : new Observation(ob))),
            });

            // ctor properties are non-temporal
            var keys = Object.keys(opts).filter(key => 
                key !== 'type' && // non-temporal
                key !== 'guid' && // immutable non-temporal
                key !== 'id' && // retroactive temporal
                key !== 'created' && // mutable non-temporal
                key !== 'obs' && // temporal implementation 
                key !== 'name');// retroactive temporal
            keys.forEach(key => {
                this[key] = opts[key];
            });

            // Asset id is retroactive temporal value initializable with ctor options
            if (opts.hasOwnProperty('id')) {
                this.observe(Asset.T_ID, opts.id, Observation.RETROACTIVE);
            } else if (opts.obs) {
                // id is in the obs
            } else {
                this.observe(Asset.T_ID, 
                    this.guid.substr(0,SHORT_GUID_DIGITS), Observation.RETROACTIVE);
            }

            // Asset name is retroactive temporal value initializable with ctor options
            if (opts.hasOwnProperty('name')) {
                this.observe(Asset.T_NAME, opts.name, Observation.RETROACTIVE);
            } else if (opts.obs) {
                // name is in obs
            } else {
                var name = `${this.namePrefix(opts)}${this.id}`;
                this.observe(Asset.T_NAME, name, Observation.RETROACTIVE);
            }
            if (opts.created) {
                this.created = opts.created instanceof Date ? opts.created : new Date(opts.created);
            } else {
                this.created = new Date();
            }
            this.ended = opts.ended || null;
        }

        static get JSON_DATE() { return JSON_DATE; }
        static get T_ASSET() { return "asset"; }
        static get T_ID() { return "id"; }
        static get T_NAME() { return "name"; }
        static get AGE_MS() { return 1; }
        static get AGE_SECONDS() { return 1000; }
        static get AGE_DAYS() { return 24 * 3600 * 1000; }

        static compareId(a,b) {
            if (a.id < b.id) {
                return -1;
            }
            return  (a.id === b.id) ? 0 : 1;
        }
        static compareGuid(a,b) {
            if (a.guid < b.guid) {
                return -1;
            }
            return  (a.guid === b.guid) ? 0 : 1;
        }

        validateTag(tag) {
            if (tag == null) {
                throw new Error("Temporal value tag is required");
            }
            if (this.hasOwnProperty(tag)) {
                throw new Error(`Property "${tag}" is not a temporal property`);
            }
            return tag;
        }

        describeProperty(name) {
            var retroTime = Observation.RETROACTIVE.getTime();
            var retroDate = Observation.RETROACTIVE.toJSON();
            var { 
                temporal,
                retroactive,
            } = this.obs.reduce((acc,ob) => {
                    if (ob.tag === name) {
                        acc.temporal = true;
                        if (ob.t.getTime() === retroTime) {
                            acc.retroactive = true;
                        }
                    }
                return acc;
            }, {
                temporal: false,
                retroactive: false,
            });
            return {
                name,
                mutable: name !== 'guid',
                temporal,
                retroactive,
                own: this.hasOwnProperty(name),
            }
        }

        namePrefix(opts={}) {
            return `${this.type}_`;
        }

        get id() { return this.get(Asset.T_ID); }
        set id(value) { this.observe(Asset.T_ID, value); return value; }

        get name() { return this.get(Asset.T_NAME); }
        set name(value) { this.observe(Asset.T_NAME, value); return value; }

        observe(...args) {
            if (typeof args[0] === 'string') { // set(tag,value,date)
                var tag = args[0];
                var t = args[2] || new Date();
                var value = args[1] === undefined ? t : args[1];
                var ob = { tag, value, t, };
                if (this.hasOwnProperty(tag)) { // non-temporal
                    if (tag === 'guid' || tag === 'type') {
                        throw new Error(`Attempt to change immutable property:${tag}`);
                    }
                    this[tag] = value;
                    return undefined; // TBD
                }
                this.validateTag(tag);
                args[3] && (ob.text = args[3]+'');
            } else { // set(Observation)
                var ob = args[0];
            }
            if (ob == null) {
                throw new Error('Asset.observe(ob) Observation is required');
            }
            if (!(ob instanceof Observation)) {
                ob = new Observation(ob);
            }
            this.obs.push(ob);
            return undefined; // TBD
        }

        getObservation(valueTag, date = new Date()) {
            this.validateTag(valueTag);
            return this.obs.reduce((acc,evt) => {    
                if (evt.tag === valueTag) {
                   return evt.t<=date && (!acc || evt.t >= acc.t) ? evt : acc;
                }
                return acc;
            }, null);
        }

        get(valueTag, date = new Date()) {
            if (this.hasOwnProperty(valueTag)) {
                return this[valueTag]; // non-temporal property
            }
            this.validateTag(valueTag);
            var Observation =  this.getObservation(valueTag, date);
            return Observation ? Observation.value : undefined;
        }

        end(t = Date.now()) {
            if (t < this.created) {
                throw new Error(`end date ${t} must be after:${this.created}`);
            }
            this.ended = t;
        }

        age(t, units = Asset.AGE_MS) {
            if (this.created == null) {
                throw new Error(`${this.name} has no created date`);
            }
            t = new Date(t || this.ended || Date.now());
            var elapsed = t - this.created;
            return elapsed / units;
        }

        ageOfTag(tag, units = Asset.AGE_MS) {
            this.validateTag(tag);
            if (!(this.created instanceof Date)) {
                throw new Error(`Expected Date for ${this.name}.created`);
            }
            var ob = this.getObservation(tag);
            if (ob == null) {
                return null; // hasn't happened yet
            }
            if (!(ob.t instanceof Date)) {
                throw new Error(`Undated observation: ${this.name}.${tag}`);
            }
            var elapsed = ob.t - this.created;
            return elapsed / units;
        }

        ageSinceTag(tag, units = Asset.AGE_MS) {
            this.validateTag(tag);
            if (!(this.created instanceof Date)) {
                throw new Error(`Expected Date for ${this.name}.created`);
            }
            var ob = this.getObservation(tag);
            if (ob == null) {
                return null; // hasn't happened yet
            }
            if (!(ob.t instanceof Date)) {
                throw new Error(`Undated observation: ${this.name}.${tag}`);
            }
            var elapsed = Date.now() - ob.t;
            return elapsed / units;
        }

        toJSON() {
            return this;
        }

        valueHistory(tag) {
            this.validateTag(tag);
            return this.obs
                .filter(ob => ob.tag === tag)
                .sort(Observation.compareTime);
        }

        updateValueHistory(tag, history) {
            this.validateTag(tag);
            var obs = this.obs.filter(ob => ob.tag !== tag);
            Observation.concat(history.filter(ob => ob.tag === tag));
            this.obs = obs;
            return undefined; // TBD
        }

        snapshot(t=new Date()) {
            var snapshot = JSON.parse(JSON.stringify(this));
            delete snapshot.obs;
            delete snapshot.name;
            var tagMap = {};
            return this.obs.reduce((snapshot,observation) => {    
                var valueTag = observation.tag;
                var ob = tagMap[valueTag];
                if (!ob && observation.t <= t || ob && ob.t <= observation.t && observation.t <= t) {
                    snapshot[valueTag] = observation.value;
                    tagMap[valueTag] = observation;
                }
                return snapshot;
            }, snapshot);
        }

        updateSnapshot(snapNew, t = new Date(), text, snapBase=this.snapshot()) {
            Object.keys(snapNew).forEach(key => {
                var newValue = snapNew[key];
                var oldValue = snapBase[key];
                if (key === 'guid' || key === 'type') {
                    if (newValue !== oldValue) {
                        throw new Error(`Asset ${key} cannot be changed`);
                    }
                } else if (newValue !== oldValue) {
                    if ((typeof newValue === 'string') && newValue.match(ISODATE)) {
                        this.observe(new Observation({
                            t: new Date(newValue),
                            tag: key,
                            value: Observation.V_EVENT,
                            text,
                        }));
                    } else {
                        this.observe(new Observation({
                            t,
                            tag: key,
                            value: newValue,
                            text,
                        }));
                    }
                } else {
                    // no change
                }
            })
            return undefined; // TBD
        }

        static merge(asset1, asset2) {
            if (asset1.guid !== asset2.guid) {
                throw new Error(`Assets with different guids cannot be merged: asset1:${asset1.guid} asset2:${asset2.guid}`);
            }
            if (asset1.obs.length < asset2.obs.length) {
                [asset1, asset2] = [asset2, asset1]; // asset1 is primary asset
            }
            var merged = new Asset(asset1);
            merged.obs = Observation.mergeObservations(
                asset1.obs, asset2.obs);
            return merged;
        }

        static keyDisplayValue(key, asset, assetMap={}, language='en-us') {
            var value = asset[key];
            if (key === 'guid') {
                return value;
            } 
            if (typeof value !== 'string') {
                return value;
            } 
            var valueAsset = assetMap[value]; // if value is a guid, show referenced asset summary
            if (valueAsset && valueAsset !== asset) {
                return `${valueAsset.name} \u2666 ${valueAsset.id} \u2666 ${valueAsset.type}`;
            }

            if (value.match(JSON_DATE)) {
                var date = new Date(value);
                var ended = asset.ended || Date.now();
                var msElapsed = ended - date;
                var days = (Math.round(msElapsed / (24*3600*1000))).toFixed(0);
                if (days < 14) {
                    var dateStr = date.toLocaleDateString(language, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                    });
                } else if (days < 365) {
                    var dateStr = date.toLocaleDateString(language, {
                        month: 'short',
                        day: 'numeric',
                    });
                } else {
                    var dateStr = date.toLocaleDateString(language, {
                        month: 'numeric',
                        day: '2-digit',
                        year:'2-digit',
                    });
                }
                var timeStr = date.toLocaleTimeString(language, {
                    hour: '2-digit',
                    minute: '2-digit',
                });
                if (key !== 'created' && asset.created) {
                    var created = new Date(asset.created);
                    var age = Math.trunc((date - created)/(24*3600*1000));
                    return `${dateStr} (${-days} days @ ${age} days) \u2666 ${timeStr}`;
                } else {
                    return `${dateStr} (${-days} days) \u2666 ${timeStr}`;
                }
            }
            return value;
        }

    } //// class Asset

    module.exports = exports.Asset = Asset;
})(typeof exports === "object" ? exports : (exports = {}));

