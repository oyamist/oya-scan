(typeof describe === 'function') && describe("Asset", function() {
    const winston = require('winston');
    const should = require("should");
    const {
        Asset,
        Observation,
        Scanner,
    } = require("../index");
    function immutable(name) {
        return {
            name,
            mutable: false,
            temporal: false,
            retroactive: false,
            own: true,
        };
    }
    function retroactive(name) {
        return {
            name,
            mutable: true,
            temporal: true,
            retroactive: true,
            own: false,
        };
    }
    function mutable(name) {
        return {
            name,
            mutable: true,
            temporal: false,
            retroactive: false,
            own: true,
        };
    }
    function unused(name) {
        return {
            name,
            mutable: true,
            temporal: false,
            retroactive: false,
            own: false,
        };
    }
    function temporal(name) {
        return {
            name,
            mutable: true,
            temporal: true,
            retroactive: false,
            own: false,
        };
    }
    var DIMENSIONS = "dimensions";
    var LOCATION = "location";
    var HARVESTED = "harvested";

    it("default ctor", function() {
        // Default ctor
        var asset = new Asset();
        should(asset.type).equal('Asset');
        var id = asset.guid.substr(0,7); // default
        should(asset.id).equal(id); // Default id 
        var name = `Asset_${asset.guid.substr(0,7)}`; // default
        should(asset.get(Asset.T_NAME)).equal(name); 
        should.deepEqual(asset.obs, [
            new Observation('id', id, Observation.RETROACTIVE),
            new Observation('name', name, Observation.RETROACTIVE),
        ]);

        // non-temporal properties are enumerable
        should.deepEqual(Object.keys(asset).sort(), [ 
            "created",
            "ended",
            "guid",
            "type",
            "obs",
        ].sort());

        // Asset name is generated if not provided
        should.deepEqual(asset.name, `Asset_${asset.guid.substr(0,7)}`); 
    });
    it("custom ctor", function() {
        var asset = new Asset({
            id: 'A0001',
        });
        should.deepEqual(asset.name, `Asset_A0001`); 
        asset.name = 'asdf';
        should.deepEqual(asset.name, `asdf`); 

        var asset2 = new Asset();
        should(asset.guid).not.equal(asset2.guid);

        // ctor options can set asset properties
        asset = new Asset({
            name: 'TomatoA',
            id: 'A0001', // if provided, id overrides guid prefix
            created,
        });
        should.deepEqual(asset.name, `TomatoA`);
        should.deepEqual(asset.id, `A0001`); // current id
        should(asset.get(Asset.T_ID, Observation.RETROACTIVE)).equal('A0001'); // id is retroactive

        // the "created" option sets non-temporal property
        var created = new Date(2018,1,10);
        asset = new Asset({
            created, // Date
        });
        should(asset.created).equal(created);
        asset = new Asset({
            created: created.toISOString(), // Date string
        });
        should(asset.created.getTime()).equal(created.getTime());
        asset = new Asset({
            created: created.toString(), // Date string
        });
        should(asset.created.getTime()).equal(created.getTime());

        // copy constructor
        var assetCopy = new Asset(asset);
        should.deepEqual(assetCopy, asset);
    });
    it("Asset is serializable", function() {
        var created = new Date();
        var asset = new Asset({
            created,
            id: 'A0001',
            name: 'tomatoA',
        });
        var json = JSON.parse(JSON.stringify(asset));
        should.deepEqual(json, {
            created: created.toJSON(),
            ended: null,
            type: "Asset",
            guid: asset.guid,
            obs:[{
                t: Observation.RETROACTIVE.toJSON(),
                tag: 'id',
                value: 'A0001',
            },{
                t: Observation.RETROACTIVE.toJSON(),
                tag: 'name',
                value: 'tomatoA',
            }]
        });
        var asset2 = new Asset(json);
        should.deepEqual(asset2, asset);

        // Compound attribute
        var value = {
            size: 'large',
            color: 'blue',
            qty: 3,
        };
        asset.observe(DIMENSIONS, value);
        should.deepEqual(asset.get(DIMENSIONS), value);
        var json = JSON.stringify(asset);
        var asset2 = new Asset(JSON.parse(json));
        should.deepEqual(asset2, asset);
        should(asset2.name).equal('tomatoA');
    });
    it("observe(...) adds observation", function() {
        var asset = new Asset();

        // positional arguments
        var t1 = new Date(2018,1,2);
        asset.observe(LOCATION, 'SFO', t1, 'textsfo');
        should(asset.get(LOCATION)).equal('SFO');
        should.deepEqual(asset.getObservation(LOCATION, t1), 
            new Observation(LOCATION, 'SFO', t1, 'textsfo'));

        // positional arguments defaults
        asset.observe(LOCATION, 'LAX');
        should(asset.getObservation(LOCATION)).properties({
            tag: LOCATION,
            value: 'LAX',
        });

        // Observation argument
        asset.observe(new Observation(LOCATION, 'ATL'));
        should(asset.get(LOCATION)).equal('ATL');

        // JSON argument
        asset.observe({
            tag: LOCATION, 
            value: 'PIT',
        });
        should(asset.get(LOCATION)).equal('PIT');

        // set prior value
        var t1 = new Date(2018,1,10);
        asset.observe(LOCATION, 'NYC', t1);
        should(asset.get(LOCATION,t1)).equal('NYC');
        should(asset.get(LOCATION)).equal('PIT');
    });
    it("get(valueTag,date) returns temporal value", function() {
        var asset = new Asset();
        asset.observe(DIMENSIONS, {
            size: 'small',
            qty: 2,
        });
        asset.observe(DIMENSIONS, { 
            size: 'large', 
        });
        var asset = new Asset(JSON.parse(JSON.stringify(asset))); // is serializable
        should.deepEqual(asset.get(DIMENSIONS), {
            size: 'large',
        });

        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        asset.observe(HARVESTED, t1, t1);
        should.equal(asset.get(HARVESTED, t1), t1); 
        asset.observe(HARVESTED, false, t2);
        should.equal(asset.get(HARVESTED, t2), false);
    });
    it("get(valueTag,date) returns non-temporal value", function() {
        var asset = new Asset();
        var t1 = new Date(2018,1,2);
        should(asset.get('guid')).equal(asset.guid);
        should(asset.get('guid', t1)).equal(asset.guid);
    });
    it("set(valueTag, value, date) sets non-temporal value", function() {
        var asset = new Asset();
        var t1 = new Date(2018,2,1);
        should(asset.created.toJSON()).not.equal(t1.toJSON());
        asset.observe("created", t1);
        should(asset.created.toJSON()).equal(t1.toJSON());

        // immutable 
        should.throws(() => {
            asset.observe("guid", "asdf");
        });
        should.throws(() => {
            asset.observe("type", "asdf");
        });
    });
    it("get() returns value for any date", function() {
        var asset = new Asset();
        var t0 = new Date(2018,0,1);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        asset.observe(LOCATION, 'SFO', t1);
        asset.observe(LOCATION, 'LAX', t2);
        asset.observe(LOCATION, 'PIT', t3);
        var asset = new Asset(JSON.parse(JSON.stringify(asset))); // is serializable
        should(asset.get(LOCATION)).equal('PIT');
        should(asset.get(LOCATION,t0)).equal(undefined);
        should(asset.get(LOCATION,t1)).equal('SFO');
        should(asset.get(LOCATION,new Date(t2.getTime()-1))).equal('SFO');
        should(asset.get(LOCATION,t2)).equal('LAX');
        should(asset.get(LOCATION,new Date(t2.getTime()+1))).equal('LAX');
        should(asset.get(LOCATION,t3)).equal('PIT');
    });
    it("snapshot(date) returns asset properties for date", function() {
        var t0 = new Date(2018,0,1);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);

        var asset = new Asset({
            created: t0,
            id: "A0001",
        });
        asset.observe(LOCATION, 'SFO', t1);


        // current snapshot
        should.deepEqual(asset.snapshot(), {
            created: t0.toJSON(),
            ended: null,
            type: "Asset",
            id: 'A0001',
            name: 'Asset_A0001',
            [LOCATION]: 'SFO',
            guid: asset.guid,
        });

        //  snapshots change with time
        asset.observe(LOCATION, 'LAX', t2);
        asset.observe(LOCATION, 'PIT', t3);
        should(asset.snapshot(t0).hasOwnProperty(LOCATION)).equal(false);
        should(asset.snapshot(t1)).properties({
            location: 'SFO',
        });
        should(asset.snapshot(new Date(t2.getTime()-1))).properties( {
            location: 'SFO',
        });
        should(asset.snapshot(t2)).properties( {
            location: 'LAX',
        });
        should(asset.snapshot(t3)).properties( {
            location: 'PIT',
        });
        should(asset.snapshot()).properties({  // current
            location: 'PIT',
        });
    });
    it("Asset can be extended", function() {
        var t0 = new Date(2018,0,1);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        class Pump extends Asset {};
        var asset = new Pump({
            created: t0,
            id: "A0001",
            name: "Mister1",
            obs:[{
                tag: 'color',
                value: 'red',
                t: t0,
            }]
        });
        should.deepEqual(asset.snapshot(), {
            created: t0.toJSON(),
            ended: null,
            type: 'Pump',
            id: 'A0001',
            name: 'Mister1',
            guid: asset.guid,
            color: 'red',
        });
    });
    it("id is a temporal value retroactive to 1/1/1970", function() {
        var async = function *() {
            var asset = new Asset({
                id: 'A0001',
            });
            var t0 = Observation.RETROACTIVE;
            var t1 = new Date();
            should(asset.id).equal('A0001');
            should(asset.get(Asset.T_ID, t0)).equal('A0001'); // retroactive
            yield setTimeout(()=>async.next(), Observation.TIME_RESOLUTION_MS);
            var t2 = new Date();
            should(t1.getTime()).below(t2.getTime());

            // sometimes asset tags get lost and need to be changed
            asset.id = 'A0002';
            should(asset.id).equal('A0002');

            // but we still remember the legacy id
            should(asset.get(Asset.T_ID, t1)).equal('A0001');
        }();
        async.next();
    });
    it("updateSnapshot(...) updates multiple properties", function(done) {
        var async = function*() {
            var t0 = new Date(2018, 1, 2);
            var asset = new Asset();
            var snap0 = asset.snapshot();
            var t1 = new Date(t0.getTime()+1);
            should.deepEqual(asset.snapshot(t0), snap0);

            // t1: set id and color 
            var snap1 = {
                id: 'A0001',
                color: 'red',
            };
            asset.updateSnapshot(snap1, t1, 'update1');
            should.deepEqual(asset.snapshot(t0), snap0); // historical
            should(asset.snapshot(t1)).properties(snap1); // historical
            var id0 = {
                tag: 'id',
                value: 'A0001',
                text: 'update1',
            };
            should(asset.getObservation('id')).properties(id0); // current
            should(asset.getObservation('color')).properties({ // current
                tag: 'color',
                value: 'red',
                text: 'update1',
            });

            // t2: set color and size
            var t2 = new Date(t1.getTime()+1);
            var snap2 = {
                color: 'blue',
                size: 'small',
            };
            asset.updateSnapshot(snap2, t2, 'update2');
            should.deepEqual(asset.snapshot(t0), snap0); // historical
            should(asset.snapshot(t1)).properties(snap1); // historical
            should(asset.snapshot(t2)).properties(snap2); // historical
            should(asset.getObservation('id')).properties(id0); // historical
            should(asset.getObservation('color')).properties({ // current
                tag: 'color',
                value: 'blue',
                text: 'update2',
            });
            should(asset.getObservation('size')).properties({ // current
                tag: 'size',
                value: 'small',
                text: 'update2',
            });

            done();
        }();
        async.next();
    });
    it("updateSnapshot(...) throws", function() {
        var asset = new Asset();

        should.throws(() => { // type is immutable
            asset.updateSnapshot({
                type: 'a new type',
            });
        });
        should.throws(() => { // guid is immutable
            asset.updateSnapshot({
                guid: 'a new guid',
            });
        });
    });
    it("snapshots map undefined values to assignment date", function(done) {
        done(); return; // dbg TODO
        var async = function*() {
            // initial state
            class Plant extends Asset {};
            var asset = new Plant();
            var t0 = Observation.RETROACTIVE;
            should(asset.get(HARVESTED, t0)).equal(undefined);

            // assignment can be with explicit date
            var t1 = new Date(2018, 1, 1);
            var ob1 = new Observation(HARVESTED, undefined, t1);
            asset.updateSnapshot({
                [HARVESTED]: t1.toJSON(),
            });
            should.deepEqual(asset.valueHistory(HARVESTED), [ ob1 ]);
            should.deepEqual(ob1.value, undefined); // store event marker value
            should(asset.snapshot()).properties({
                HARVESTED: t1.toJSON(),
            });

            var t2 = new Date(2018, 1, 2);
            var ob2 = new Observation(HARVESTED, undefined, t2);
            var t3 = new Date(2018, 1, 3);
            var ob3 = new Observation(HARVESTED, false, t3);
            var tfuture = new Date(Date.now() + 365*24*3600*1000);
            var obfuture = new Observation(HARVESTED, undefined, tfuture);

            // map undefined to assignment date
            asset.updateSnapshot({
                [HARVESTED]: undefined,
            }, t2);
            should.deepEqual(asset.valueHistory(HARVESTED), [ ob1, ob2 ]);
            should.deepEqual(ob2.value, undefined); // event marker value
            should(asset.snapshot()).properties({ 
                HARVESTED: t2.toJSON(), // current 
            });
            should(asset.snapshot(t1)).properties({ 
                HARVESTED: t1.toJSON(), // historical
            });

            // future dates are supported without "plan vs. actual" distinction
            asset.updateSnapshot({
                [HARVESTED]: tfuture.toJSON(),
            });
            should.deepEqual(asset.valueHistory(HARVESTED), [ ob1, ob2, obfuture ]);
            should(asset.snapshot()).properties({ // snapshot returns current HARVESTED date
                HARVESTED: t2.toJSON(),
            });
            should(asset.snapshot(tfuture)).properties({ // snapshot returns current HARVESTED date
                HARVESTED: tfuture.toJSON(),
            });

            // false is supported directly
            asset.updateSnapshot({
                [HARVESTED]: false,
            }, t3);
            should.deepEqual(asset.valueHistory(HARVESTED), [ ob1, ob2, ob3, obfuture ]);
            should(asset.snapshot()).properties( { // current HARVESTED date
                HARVESTED: false,
            });
            should(asset.snapshot(tfuture)).properties({
                HARVESTED: tfuture.toJSON(),
            });

            done();
        }();
        async.next();
    });
    it("keyDisplayValue(key, asset, assetMap, locale)", function() {
        var asset = new Asset();
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        var t4 = new Date(2018,1,10);
        assetMap = {
            [asset.guid]: asset,
        };
        asset.color = 'red';
        should.deepEqual(Asset.keyDisplayValue('color' , asset, assetMap), 'red');
        asset.height = 1.43;
        should.deepEqual(Asset.keyDisplayValue('height' , asset, assetMap), 1.43);
        asset.graduated = t1;
        should.deepEqual(Asset.keyDisplayValue('graduated' , asset, assetMap), t1);
        asset.created = t1;
        asset.ended = t4;
        asset.married = t3.toISOString();
        should.deepEqual(Asset.keyDisplayValue('married' , asset, assetMap), 
            'Sat, Feb 3 (-7 days @ 2 days) \u2666 12:00 AM');
    });
    it("age(...) returns age since creation", () => {
        var t1 = new Date(2018, 1, 2);
        var asset = new Asset({
            created: t1,
        });

        // non-ended asset: default is current age
        var now = Date.now();
        should(asset.age()).above(now-t1-1).below(now-t1+100);

        // non-ended asset: age at given date
        var days2 = 2 * 24 * 3600 * 1000;
        var t2 = new Date(t1.getTime() + days2);
        should(asset.age(t2)).equal(days2/Asset.AGE_MS);
        should(asset.age(t2, Asset.AGE_SECONDS))
            .equal(days2/Asset.AGE_SECONDS);
        should(asset.age(t2, Asset.AGE_DAYS))
            .equal(days2/Asset.AGE_DAYS);

        // ended asset
        asset.end(t2); // sets maximum age
        should(asset.age(t2-1)).equal(days2-1);
        should(asset.age(t2)).equal(days2);
        should(asset.age(t2+1)).equal(days2);
        should(asset.age()).equal(days2);

    });
    it("ageOfTag(...) returns age of most recent observation", () => {
        var t1 = new Date(2018, 1, 2);
        var asset = new Asset({
            created: t1,
        });

        // No observation
        should(asset.ageOfTag(HARVESTED)).equal(null);

        // Single observation
        var days1 = 24 * 3600 * 1000;
        var days2 = 2 * days1;
        var t2 = new Date(t1.getTime() + days2);
        asset.observe(HARVESTED, 1, t2); // Harvested 1 tomato
        should(asset.ageOfTag(HARVESTED)).equal(days2);

        // Multiple observations uses most recent
        var t3 = new Date(t2.getTime() + days1);
        asset.observe(HARVESTED, 3, t3); // Harvested 3 tomatoes
        should(asset.ageOfTag(HARVESTED)).equal(days2+days1);

        // Units
        should(asset.ageOfTag(HARVESTED, Asset.AGE_DAYS)).equal(3);
    });
    it("ageSinceTag(...) returns age since observation", () => {
        var t1 = new Date(2018, 1, 2);
        var asset = new Asset({
            created: t1,
        });

        // No observation
        should(asset.ageSinceTag(HARVESTED)).equal(null);

        // Single observation
        var days1 = 24 * 3600 * 1000;
        var days2 = 2 * days1;
        var t2 = new Date(t1.getTime() + days2);
        asset.observe(HARVESTED, 1, t2); // Harvested 1 tomato
        should(asset.ageSinceTag(HARVESTED)).equal(Date.now() - t2);

        // Multiple observations uses most recent
        var t3 = new Date(t2.getTime() + days1);
        asset.observe(HARVESTED, 3, t3); // Harvested 3 tomatoes
        should(asset.ageSinceTag(HARVESTED)).equal(Date.now() - t3);

        // Units
        should(asset.ageSinceTag(HARVESTED, Asset.AGE_DAYS))
            .equal((Date.now() - t3) / days1);
    });
    it("valueHistory(tag) returns tag observation array", ()=>{
        var asset = new Asset();
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        asset.observe('color', 'blue', t3, 'C');
        asset.observe('color', 'red', t1, 'A',);
        asset.observe('color', 'green', t2, 'B');
        var history = asset.valueHistory('color');
        should.deepEqual(history.map(tv=>tv.value), ['red','green', 'blue']);
        should.deepEqual(history.map(tv=>tv.t), [t1,t2,t3]);
        should.deepEqual(history.map(tv=>tv.tag), ['color','color','color']);
        should.deepEqual(history.map(tv=>tv.text), ['A','B','C']);
    });
    it("describeProperty(name) returns description", ()=>{
        var asset = new Asset({
            size: 'large',
        });
        should.deepEqual(asset.describeProperty('guid'),
            immutable('guid'));
        should.deepEqual(asset.describeProperty('type'),
            mutable('type'));
        should.deepEqual(asset.describeProperty('id'),
            retroactive('id'));
        should.deepEqual(asset.describeProperty('size'),
            mutable('size'));
        should.deepEqual(asset.describeProperty('asdf'),
            unused('asdf'));
        should.deepEqual(asset.describeProperty('location'), 
            unused('location'));
        should.deepEqual(asset.describeProperty('color'),
            unused('color'));

        // create a temporal property
        asset.observe("location", "SFO");
        should.deepEqual(asset.describeProperty('location'),
            temporal('location'));

        // create retroactive property
        asset.observe("color", 'red', Observation.RETROACTIVE);
        should.deepEqual(asset.describeProperty('color'),
            retroactive('color'));

        // serialized asset has same property definitions
        var asset = new Asset(JSON.parse(JSON.stringify(asset)));
        should.deepEqual(asset.describeProperty('guid'),
            immutable('guid'));
        should.deepEqual(asset.describeProperty('type'),
            mutable('type'));
        should.deepEqual(asset.describeProperty('id'),
            retroactive('id'));
        should.deepEqual(asset.describeProperty('size'),
            mutable('size'));
        should.deepEqual(asset.describeProperty('asdf'),
            unused('asdf'));
        should.deepEqual(asset.describeProperty('location'),
            temporal('location'));
        should.deepEqual(asset.describeProperty('color'),
            retroactive('color'));
    });
    it("merge(asset1,asset2) two versions of same asset", function() {
        var t = [
            new Date(2018,11,1),
            new Date(2018,11,2),
            new Date(2018,11,3),
        ];
        var asset1 = new Asset({
            id: 'asset1',
            color: 'red1',
        });
        asset1.observe('inspected', true, t[0]);
        asset1.observe('inspected', true, t[1]);
        var asset2 = new Asset(Object.assign({}, asset1, {
            id: 'asset2',
            color: 'red2',
        }));
        asset2.observe('inspected', true, t[2]);

        var expected = new Asset(JSON.parse(JSON.stringify(asset2)));
        var etv = expected.obs.sort((a,b) => Observation.compare_t_tag(a,b));
        for (var i = 1; i < etv.length; i++) {
            should(Observation.compare_t_tag(etv[i-1],etv[i])).below(1);
        }
        var merged = Asset.merge(asset1,asset2);
        merged.obs.sort(Observation.compare_t_tag);
        should.deepEqual(merged.obs.map(tv=>tv.toString()), 
            expected.obs.map(tv=>tv.toString()));
        should.deepEqual(merged, expected);
    });

})
