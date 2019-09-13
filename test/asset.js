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
    var ACTIVATED = "activated";

    it("TESTTESTdefault ctor", function() {
        // Default ctor
        var asset = new Asset();
        should(asset.type).equal('Asset');
        should(asset.id).equal(asset.guid.substr(0,7)); // Default id 
        should(asset.get(Asset.T_NAME))
            .equal(`Asset_${asset.guid.substr(0,7)}`); // Default namesset
        should.deepEqual(asset.obs, [
            new Observation({
                t: Observation.RETROACTIVE,
                tag: 'id',
                value: asset.guid.substr(0,7),
            }),
            new Observation({
                t: Observation.RETROACTIVE,
                tag: 'name',
                value: `Asset_${asset.guid.substr(0,7)}`,
            }),
        ]);

        // non-temporal properties are enumerable
        should.deepEqual(Object.keys(asset).sort(), [ 
            "created",
            "end",
            "guid",
            "type",
            "obs",
        ].sort());

        // Asset name is generated if not provided
        should.deepEqual(asset.name, `Asset_${asset.guid.substr(0,7)}`); 
    });
    it("TESTTESTcustom ctor", function() {
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
    it("TESTTESTAsset is serializable", function() {
        var created = new Date();
        var asset = new Asset({
            created,
            id: 'A0001',
            name: 'tomatoA',
        });
        var json = JSON.parse(JSON.stringify(asset));
        should.deepEqual(json, {
            created: created.toJSON(),
            end: null,
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
    it("TESTTESTobserve(valueTag, value, date) adds observation", function() {
        var asset = new Asset();

        // set(valueTag, value)
        asset.observe(LOCATION, 'SFO');
        should(asset.get(LOCATION)).equal('SFO');
        asset.observe(LOCATION, 'LAX');
        should(asset.get(LOCATION)).equal('LAX');

        // set(Observation)
        asset.observe(new Observation({
            tag: LOCATION, 
            value: 'ATL',
        }));
        should(asset.get(LOCATION)).equal('ATL');
        asset.observe({
            tag: LOCATION, 
            value: 'PIT',
        });
        should(asset.get(LOCATION)).equal('PIT');

        // set prior value
        var t1 = new Date(2018,1,10);
        asset.observe({
            tag: LOCATION, 
            value: 'NYC',
            t: t1,
        });
        should(asset.get(LOCATION,t1)).equal('NYC');
        should(asset.get(LOCATION)).equal('PIT');
    });
    it("TESTTESTget(valueTag,date) returns temporal value", function() {
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
        asset.observe(ACTIVATED, t1, t1);
        should.equal(asset.get(ACTIVATED, t1), t1); 
        asset.observe(ACTIVATED, false, t2);
        should.equal(asset.get(ACTIVATED, t2), false);
    });
    it("TESTTESTget(valueTag,date) returns non-temporal value", function() {
        var asset = new Asset();
        var t1 = new Date(2018,1,2);
        should(asset.get('guid')).equal(asset.guid);
        should(asset.get('guid', t1)).equal(asset.guid);
    });
    it("TESTTESTset(valueTag, value, date) sets non-temporal value", function() {
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
    it("TESTTESTget() returns value for any date", function() {
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
    it("TESTTESTsnapshot(date) returns asset properties for date", function() {
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
            end: null,
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
    it("TESTTESTAsset can be extended", function() {
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
            end: null,
            type: 'Pump',
            id: 'A0001',
            name: 'Mister1',
            guid: asset.guid,
            color: 'red',
        });
    });
    it("TESTTESTid is a temporal value retroactive to 1/1/1970", function() {
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
    it("TESTTESTupdateSnapshot(...) updates properties", function(done) {
        var async = function*() {
            var t0 = new Date();
            var asset = new Asset();
            var assetOld = new Asset(asset);
            var snapBase = asset.snapshot();
            yield setTimeout(() => (async.next()), 10);
            var t1 = new Date();

            asset.updateSnapshot({
                id: 'A0001',
            }, t1, 'update1');
            should(asset.id).equal('A0001');
            should(asset.get('id', t0)).equal(assetOld.id);
            should.deepEqual(asset.obs.length, 3);
            should.deepEqual(asset.valueHistory('id'), [
                new Observation({
                    t:Observation.RETROACTIVE,
                    tag: 'id',
                    value: `${asset.guid.substr(0,7)}`,
                }), 
                new Observation({
                    t:t1,
                    text: 'update1',
                    tag: 'id',
                    value: 'A0001',
                }),
            ]);

            // ignore redundant updates
            yield setTimeout(() => (async.next()), 1);
            var t2 = new Date();
            asset.updateSnapshot({
                id: 'A0001',
            }, t2, 'update1');
            should(asset.id).equal('A0001');
            should(asset.get('id', t0)).equal(assetOld.id);
            should.deepEqual(asset.obs.length, 3);

            should.throws(() => {
                asset.updateSnapshot({
                    type: 'a new type',
                });
            });
            should.throws(() => {
                asset.updateSnapshot({
                    guid: 'a new guid',
                });
            });

            done();
        }();
        async.next();
    });
    it("TESTTESTupdateSnapshot(...) adds properties", function(done) {
        var async = function*() {
            var t0 = new Date();
            var asset = new Asset({
                created: t0,
            });
            var assetOld = new Asset(asset);
            var snapBase = asset.snapshot();
            yield setTimeout(() => (async.next()), 10);
            var t1 = new Date();

            asset.updateSnapshot({
                size: 'Large',
            }, t1, 'update1');
            should(asset.get('size', t0)).equal(undefined);
            should(asset.get('size', t1)).equal('Large');
            should(asset.get('size')).equal('Large');
            should.deepEqual(asset.snapshot(), {
                created: t0.toJSON(),
                end: null,
                guid: asset.guid,
                id: asset.id,
                name: asset.name,
                type: 'Asset',
                size: 'Large',
            });
            done();
        }();
        async.next();
    });
    it("TESTTESTsnapshots map undefined values to assignment date", function(done) {
        done(); return; // dbg TODO
        var async = function*() {
            var asset = new Asset();
            var t0 = Observation.RETROACTIVE;
            var t1 = new Date(2018, 1, 1);
            var ob1 = new Observation({
                tag: ACTIVATED,
                value: undefined,
                t: t1,
            });
            var t2 = new Date(2018, 1, 2);
            var ob2 = new Observation({
                tag: ACTIVATED,
                value: undefined,
                t: t2,
            });
            var t3 = new Date(2018, 1, 3);
            var ob3 = new Observation({
                tag: ACTIVATED,
                value: false,
                t: t3,
            });
            var tfuture = new Date(Date.now() + 365*24*3600*1000);
            var obfuture = new Observation({
                tag: ACTIVATED,
                value: undefined,
                t: tfuture,
            });

            // before first assignment
            should(asset.get(ACTIVATED, t0)).equal(undefined);

            // assignment can be with explicit date
            asset.updateSnapshot({
                [ACTIVATED]: t1.toJSON(),
            });
            should.deepEqual(asset.valueHistory(ACTIVATED), [ ob1 ]);
            should.deepEqual(ob1.value, undefined); // store event marker value
            should(asset.snapshot()).properties({
                activated: t1.toJSON(),
            });

            // map undefined to assignment date
            asset.updateSnapshot({
                [ACTIVATED]: undefined,
            }, t2);
            should.deepEqual(asset.valueHistory(ACTIVATED), [ ob1, ob2 ]);
            should.deepEqual(ob2.value, undefined); // event marker value
            should(asset.snapshot()).properties({ // snapshot returns current activated date
                activated: t2.toJSON(),
            });
            should(asset.snapshot(t1)).properties({ 
                activated: t1.toJSON(),
            });

            // future dates are supported without "plan vs. actual" distinction
            asset.updateSnapshot({
                [ACTIVATED]: tfuture.toJSON(),
            });
            should.deepEqual(asset.valueHistory(ACTIVATED), [ ob1, ob2, obfuture ]);
            should(asset.snapshot()).properties({ // snapshot returns current activated date
                activated: t2.toJSON(),
            });
            should(asset.snapshot(tfuture)).properties({ // snapshot returns current activated date
                activated: tfuture.toJSON(),
            });

            // false is supported directly
            asset.updateSnapshot({
                [ACTIVATED]: false,
            }, t3);
            should.deepEqual(asset.valueHistory(ACTIVATED), [ ob1, ob2, ob3, obfuture ]);
            should(asset.snapshot()).properties( { // snapshot returns current activated date
                activated: false,
            });
            should(asset.snapshot(tfuture)).properties({
                activated: tfuture.toJSON(),
            });

            done();
        }();
        async.next();
    });
    it("TESTTESTkeyDisplayValue(key, asset, assetMap, locale)", function() {
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
        asset.end = t4;
        asset.married = t3.toISOString();
        should.deepEqual(Asset.keyDisplayValue('married' , asset, assetMap), 
            'Sat, Feb 3 (-7 days @ 2 days) \u2666 12:00 AM');
    });
    it("TESTTESTvalueHistory(tag) returns array of observations of tag", function() {
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
    it("describeProperty(name) returns property description", function() {
        var asset = new Asset({
            size: 'large',
        });
        should.deepEqual(asset.describeProperty('guid'), immutable('guid'));
        should.deepEqual(asset.describeProperty('type'), immutable('type'));
        should.deepEqual(asset.describeProperty('id'), retroactive('id'));
        should.deepEqual(asset.describeProperty('size'), mutable('size'));
        should.deepEqual(asset.describeProperty('asdf'), unused('asdf'));
        should.deepEqual(asset.describeProperty('location'), unused('location'));
        should.deepEqual(asset.describeProperty('color'), unused('color'));

        // create a temporal property
        asset.observe("location", "SFO");
        should.deepEqual(asset.describeProperty('location'), temporal('location'));

        // create retroactive property
        asset.observe("color", 'red', Observation.RETROACTIVE);
        should.deepEqual(asset.describeProperty('color'), retroactive('color'));

        // serialized asset has same property definitions
        var asset = new Asset(JSON.parse(JSON.stringify(asset)));
        should.deepEqual(asset.describeProperty('guid'), immutable('guid'));
        should.deepEqual(asset.describeProperty('type'), immutable('type'));
        should.deepEqual(asset.describeProperty('id'), retroactive('id'));
        should.deepEqual(asset.describeProperty('size'), mutable('size'));
        should.deepEqual(asset.describeProperty('asdf'), unused('asdf'));
        should.deepEqual(asset.describeProperty('location'), temporal('location'));
        should.deepEqual(asset.describeProperty('color'), retroactive('color'));
    });
    it("TESTTESTmerge(asset1,asset2) two versions of same asset", function() {
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
