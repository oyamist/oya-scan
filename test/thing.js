(typeof describe === 'function') && describe("thing", function() {
    const winston = require('winston');
    const should = require("should");
    const {
        Thing,
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
        var thing = new Thing();
        should(thing.type).equal('Thing');
        var id = thing.guid.substr(0,7); // default
        should(thing.id).equal(id); // Default id 
        var name = `Thing_${thing.guid.substr(0,7)}`; // default
        should(thing.get(Thing.T_NAME)).equal(name); 
        should.deepEqual(thing.obs, [
            new Observation('id', id, Observation.RETROACTIVE),
            new Observation('name', name, Observation.RETROACTIVE),
        ]);

        // non-temporal properties are enumerable
        should.deepEqual(Object.keys(thing).sort(), [ 
            "created",
            "ended",
            "guid",
            "type",
            "obs",
        ].sort());

        // Thing name is generated if not provided
        should.deepEqual(thing.name, `Thing_${thing.guid.substr(0,7)}`); 
    });
    it("custom ctor", function() {
        var thing = new Thing({
            id: 'A0001',
        });
        should.deepEqual(thing.name, `Thing_A0001`); 
        thing.name = 'asdf';
        should.deepEqual(thing.name, `asdf`); 

        var thing2 = new Thing();
        should(thing.guid).not.equal(thing2.guid);

        // ctor options can set thing properties
        thing = new Thing({
            name: 'TomatoA',
            id: 'A0001', // if provided, id overrides guid prefix
            created,
        });
        should.deepEqual(thing.name, `TomatoA`);
        should.deepEqual(thing.id, `A0001`); // current id
        should(thing.get(Thing.T_ID, Observation.RETROACTIVE)).equal('A0001'); // id is retroactive

        // the "created" option sets non-temporal property
        var created = new Date(2018,1,10);
        thing = new Thing({
            created, // Date
        });
        should(thing.created).equal(created);
        thing = new Thing({
            created: created.toISOString(), // Date string
        });
        should(thing.created.getTime()).equal(created.getTime());
        thing = new Thing({
            created: created.toString(), // Date string
        });
        should(thing.created.getTime()).equal(created.getTime());

        // copy constructor
        var thingCopy = new Thing(thing);
        should.deepEqual(thingCopy, thing);
    });
    it("Thing is serializable", function() {
        var created = new Date();
        var thing = new Thing({
            created,
            id: 'A0001',
            name: 'tomatoA',
        });
        var json = JSON.parse(JSON.stringify(thing));
        should.deepEqual(json, {
            created: created.toJSON(),
            ended: null,
            type: "Thing",
            guid: thing.guid,
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
        var thing2 = new Thing(json);
        should.deepEqual(thing2, thing);

        // Compound attribute
        var value = {
            size: 'large',
            color: 'blue',
            qty: 3,
        };
        thing.observe(DIMENSIONS, value);
        should.deepEqual(thing.get(DIMENSIONS), value);
        var json = JSON.stringify(thing);
        var thing2 = new Thing(JSON.parse(json));
        should.deepEqual(thing2, thing);
        should(thing2.name).equal('tomatoA');
    });
    it("observe(...) adds observation", function() {
        var thing = new Thing();

        // positional arguments
        var t1 = new Date(2018,1,2);
        thing.observe(LOCATION, 'SFO', t1, 'textsfo');
        should(thing.get(LOCATION)).equal('SFO');
        should.deepEqual(thing.getObservation(LOCATION, t1), 
            new Observation(LOCATION, 'SFO', t1, 'textsfo'));

        // positional arguments defaults
        thing.observe(LOCATION, 'LAX');
        should(thing.getObservation(LOCATION)).properties({
            tag: LOCATION,
            value: 'LAX',
        });

        // Observation argument
        thing.observe(new Observation(LOCATION, 'ATL'));
        should(thing.get(LOCATION)).equal('ATL');

        // JSON argument
        thing.observe({
            tag: LOCATION, 
            value: 'PIT',
        });
        should(thing.get(LOCATION)).equal('PIT');

        // set prior value
        var t1 = new Date(2018,1,10);
        thing.observe(LOCATION, 'NYC', t1);
        should(thing.get(LOCATION,t1)).equal('NYC');
        should(thing.get(LOCATION)).equal('PIT');
    });
    it("get(valueTag,date) returns temporal value", function() {
        var thing = new Thing();
        thing.observe(DIMENSIONS, {
            size: 'small',
            qty: 2,
        });
        thing.observe(DIMENSIONS, { 
            size: 'large', 
        });
        var thing = new Thing(JSON.parse(JSON.stringify(thing))); // is serializable
        should.deepEqual(thing.get(DIMENSIONS), {
            size: 'large',
        });

        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        thing.observe(HARVESTED, t1, t1);
        should.equal(thing.get(HARVESTED, t1), t1); 
        thing.observe(HARVESTED, false, t2);
        should.equal(thing.get(HARVESTED, t2), false);
    });
    it("get(valueTag,date) returns non-temporal value", function() {
        var thing = new Thing();
        var t1 = new Date(2018,1,2);
        should(thing.get('guid')).equal(thing.guid);
        should(thing.get('guid', t1)).equal(thing.guid);
    });
    it("set(valueTag, value, date) sets non-temporal value", function() {
        var thing = new Thing();
        var t1 = new Date(2018,2,1);
        should(thing.created.toJSON()).not.equal(t1.toJSON());
        thing.observe("created", t1);
        should(thing.created.toJSON()).equal(t1.toJSON());

        // immutable 
        should.throws(() => {
            thing.observe("guid", "asdf");
        });
        should.throws(() => {
            thing.observe("type", "asdf");
        });
    });
    it("get() returns value for any date", function() {
        var thing = new Thing();
        var t0 = new Date(2018,0,1);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        thing.observe(LOCATION, 'SFO', t1);
        thing.observe(LOCATION, 'LAX', t2);
        thing.observe(LOCATION, 'PIT', t3);
        var thing = new Thing(JSON.parse(JSON.stringify(thing))); // is serializable
        should(thing.get(LOCATION)).equal('PIT');
        should(thing.get(LOCATION,t0)).equal(undefined);
        should(thing.get(LOCATION,t1)).equal('SFO');
        should(thing.get(LOCATION,new Date(t2.getTime()-1))).equal('SFO');
        should(thing.get(LOCATION,t2)).equal('LAX');
        should(thing.get(LOCATION,new Date(t2.getTime()+1))).equal('LAX');
        should(thing.get(LOCATION,t3)).equal('PIT');
    });
    it("snapshot(date) returns thing properties for date", function() {
        var t0 = new Date(2018,0,1);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);

        var thing = new Thing({
            created: t0,
            id: "A0001",
        });
        thing.observe(LOCATION, 'SFO', t1);


        // current snapshot
        should.deepEqual(thing.snapshot(), {
            created: t0.toJSON(),
            ended: null,
            type: "Thing",
            id: 'A0001',
            name: 'Thing_A0001',
            [LOCATION]: 'SFO',
            guid: thing.guid,
        });

        //  snapshots change with time
        thing.observe(LOCATION, 'LAX', t2);
        thing.observe(LOCATION, 'PIT', t3);
        should(thing.snapshot(t0).hasOwnProperty(LOCATION)).equal(false);
        should(thing.snapshot(t1)).properties({
            location: 'SFO',
        });
        should(thing.snapshot(new Date(t2.getTime()-1))).properties( {
            location: 'SFO',
        });
        should(thing.snapshot(t2)).properties( {
            location: 'LAX',
        });
        should(thing.snapshot(t3)).properties( {
            location: 'PIT',
        });
        should(thing.snapshot()).properties({  // current
            location: 'PIT',
        });
    });
    it("Thing can be extended", function() {
        var t0 = new Date(2018,0,1);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        class Pump extends Thing {};
        var thing = new Pump({
            created: t0,
            id: "A0001",
            name: "Mister1",
            obs:[{
                tag: 'color',
                value: 'red',
                t: t0,
            }]
        });
        should.deepEqual(thing.snapshot(), {
            created: t0.toJSON(),
            ended: null,
            type: 'Pump',
            id: 'A0001',
            name: 'Mister1',
            guid: thing.guid,
            color: 'red',
        });
    });
    it("id is a temporal value retroactive to 1/1/1970", function() {
        var async = function *() {
            var thing = new Thing({
                id: 'A0001',
            });
            var t0 = Observation.RETROACTIVE;
            var t1 = new Date();
            should(thing.id).equal('A0001');
            should(thing.get(Thing.T_ID, t0)).equal('A0001'); // retroactive
            yield setTimeout(()=>async.next(), Observation.TIME_RESOLUTION_MS);
            var t2 = new Date();
            should(t1.getTime()).below(t2.getTime());

            // sometimes thing tags get lost and need to be changed
            thing.id = 'A0002';
            should(thing.id).equal('A0002');

            // but we still remember the legacy id
            should(thing.get(Thing.T_ID, t1)).equal('A0001');
        }();
        async.next();
    });
    it("updateSnapshot(...) updates multiple properties", function(done) {
        var async = function*() {
            var t0 = new Date(2018, 1, 2);
            var thing = new Thing();
            var snap0 = thing.snapshot();
            var t1 = new Date(t0.getTime()+1);
            should.deepEqual(thing.snapshot(t0), snap0);

            // t1: set id and color 
            var snap1 = {
                id: 'A0001',
                color: 'red',
            };
            thing.updateSnapshot(snap1, t1, 'update1');
            should.deepEqual(thing.snapshot(t0), snap0); // historical
            should(thing.snapshot(t1)).properties(snap1); // historical
            var id0 = {
                tag: 'id',
                value: 'A0001',
                text: 'update1',
            };
            should(thing.getObservation('id')).properties(id0); // current
            should(thing.getObservation('color')).properties({ // current
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
            thing.updateSnapshot(snap2, t2, 'update2');
            should.deepEqual(thing.snapshot(t0), snap0); // historical
            should(thing.snapshot(t1)).properties(snap1); // historical
            should(thing.snapshot(t2)).properties(snap2); // historical
            should(thing.getObservation('id')).properties(id0); // historical
            should(thing.getObservation('color')).properties({ // current
                tag: 'color',
                value: 'blue',
                text: 'update2',
            });
            should(thing.getObservation('size')).properties({ // current
                tag: 'size',
                value: 'small',
                text: 'update2',
            });

            done();
        }();
        async.next();
    });
    it("updateSnapshot(...) throws", function() {
        var thing = new Thing();

        should.throws(() => { // type is immutable
            thing.updateSnapshot({
                type: 'a new type',
            });
        });
        should.throws(() => { // guid is immutable
            thing.updateSnapshot({
                guid: 'a new guid',
            });
        });
    });
    it("snapshots map undefined values to assignment date", function(done) {
        done(); return; // dbg TODO
        var async = function*() {
            // initial state
            class Plant extends Thing {};
            var thing = new Plant();
            var t0 = Observation.RETROACTIVE;
            should(thing.get(HARVESTED, t0)).equal(undefined);

            // assignment can be with explicit date
            var t1 = new Date(2018, 1, 1);
            var ob1 = new Observation(HARVESTED, undefined, t1);
            thing.updateSnapshot({
                [HARVESTED]: t1.toJSON(),
            });
            should.deepEqual(thing.valueHistory(HARVESTED), [ ob1 ]);
            should.deepEqual(ob1.value, undefined); // store event marker value
            should(thing.snapshot()).properties({
                HARVESTED: t1.toJSON(),
            });

            var t2 = new Date(2018, 1, 2);
            var ob2 = new Observation(HARVESTED, undefined, t2);
            var t3 = new Date(2018, 1, 3);
            var ob3 = new Observation(HARVESTED, false, t3);
            var tfuture = new Date(Date.now() + 365*24*3600*1000);
            var obfuture = new Observation(HARVESTED, undefined, tfuture);

            // map undefined to assignment date
            thing.updateSnapshot({
                [HARVESTED]: undefined,
            }, t2);
            should.deepEqual(thing.valueHistory(HARVESTED), [ ob1, ob2 ]);
            should.deepEqual(ob2.value, undefined); // event marker value
            should(thing.snapshot()).properties({ 
                HARVESTED: t2.toJSON(), // current 
            });
            should(thing.snapshot(t1)).properties({ 
                HARVESTED: t1.toJSON(), // historical
            });

            // future dates are supported without "plan vs. actual" distinction
            thing.updateSnapshot({
                [HARVESTED]: tfuture.toJSON(),
            });
            should.deepEqual(thing.valueHistory(HARVESTED), [ ob1, ob2, obfuture ]);
            should(thing.snapshot()).properties({ // snapshot returns current HARVESTED date
                HARVESTED: t2.toJSON(),
            });
            should(thing.snapshot(tfuture)).properties({ // snapshot returns current HARVESTED date
                HARVESTED: tfuture.toJSON(),
            });

            // false is supported directly
            thing.updateSnapshot({
                [HARVESTED]: false,
            }, t3);
            should.deepEqual(thing.valueHistory(HARVESTED), [ ob1, ob2, ob3, obfuture ]);
            should(thing.snapshot()).properties( { // current HARVESTED date
                HARVESTED: false,
            });
            should(thing.snapshot(tfuture)).properties({
                HARVESTED: tfuture.toJSON(),
            });

            done();
        }();
        async.next();
    });
    it("keyDisplayValue(key, thing, thingMap, locale)", function() {
        var thing = new Thing();
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        var t4 = new Date(2018,1,10);
        thingMap = {
            [thing.guid]: thing,
        };
        thing.color = 'red';
        should.deepEqual(Thing.keyDisplayValue('color' , thing, thingMap), 'red');
        thing.height = 1.43;
        should.deepEqual(Thing.keyDisplayValue('height' , thing, thingMap), 1.43);
        thing.graduated = t1;
        should.deepEqual(Thing.keyDisplayValue('graduated' , thing, thingMap), t1);
        thing.created = t1;
        thing.ended = t4;
        thing.married = t3.toISOString();
        should.deepEqual(Thing.keyDisplayValue('married' , thing, thingMap), 
            'Sat, Feb 3 (-7 days @ 2 days) \u2666 12:00 AM');
    });
    it("age(...) returns age since creation", () => {
        var t1 = new Date(2018, 1, 2);
        var thing = new Thing({
            created: t1,
        });

        // non-ended thing: default is current age
        var now = Date.now();
        should(thing.age()).above(now-t1-1).below(now-t1+100);

        // non-ended thing: age at given date
        var days2 = 2 * 24 * 3600 * 1000;
        var t2 = new Date(t1.getTime() + days2);
        should(thing.age(t2)).equal(days2/Thing.AGE_MS);
        should(thing.age(t2, Thing.AGE_SECONDS))
            .equal(days2/Thing.AGE_SECONDS);
        should(thing.age(t2, Thing.AGE_DAYS))
            .equal(days2/Thing.AGE_DAYS);

        // ended thing
        thing.end(t2); // sets maximum age
        should(thing.age(t2-1)).equal(days2-1);
        should(thing.age(t2)).equal(days2);
        should(thing.age(t2+1)).equal(days2);
        should(thing.age()).equal(days2);

    });
    it("ageOfTag(...) returns age of most recent observation", () => {
        var t1 = new Date(2018, 1, 2);
        var thing = new Thing({
            created: t1,
        });

        // No observation
        should(thing.ageOfTag(HARVESTED)).equal(null);

        // Single observation
        var days1 = 24 * 3600 * 1000;
        var days2 = 2 * days1;
        var t2 = new Date(t1.getTime() + days2);
        thing.observe(HARVESTED, 1, t2); // Harvested 1 tomato
        should(thing.ageOfTag(HARVESTED)).equal(days2);

        // Multiple observations uses most recent
        var t3 = new Date(t2.getTime() + days1);
        thing.observe(HARVESTED, 3, t3); // Harvested 3 tomatoes
        should(thing.ageOfTag(HARVESTED)).equal(days2+days1);

        // Units
        should(thing.ageOfTag(HARVESTED, Thing.AGE_DAYS)).equal(3);
    });
    it("ageSinceTag(...) returns age since observation", () => {
        var t1 = new Date(2018, 1, 2);
        var thing = new Thing({
            created: t1,
        });

        // No observation
        should(thing.ageSinceTag(HARVESTED)).equal(null);

        // Single observation
        var days1 = 24 * 3600 * 1000;
        var days2 = 2 * days1;
        var t2 = new Date(t1.getTime() + days2);
        thing.observe(HARVESTED, 1, t2); // Harvested 1 tomato
        var elapsed = Date.now() - t2;
        should(thing.ageSinceTag(HARVESTED)).equal(elapsed);

        // Multiple observations uses most recent
        var t3 = new Date(t2.getTime() + days1);
        thing.observe(HARVESTED, 3, t3); // Harvested 3 tomatoes
        should(thing.ageSinceTag(HARVESTED)).equal(Date.now() - t3);

        // Units
        should(thing.ageSinceTag(HARVESTED, Thing.AGE_DAYS))
            .equal((Date.now() - t3) / days1);
    });
    it("valueHistory(tag) returns tag observation array", ()=>{
        var thing = new Thing();
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        thing.observe('color', 'blue', t3, 'C');
        thing.observe('color', 'red', t1, 'A',);
        thing.observe('color', 'green', t2, 'B');
        var history = thing.valueHistory('color');
        should.deepEqual(history.map(tv=>tv.value), ['red','green', 'blue']);
        should.deepEqual(history.map(tv=>tv.t), [t1,t2,t3]);
        should.deepEqual(history.map(tv=>tv.tag), ['color','color','color']);
        should.deepEqual(history.map(tv=>tv.text), ['A','B','C']);
    });
    it("describeProperty(name) returns description", ()=>{
        var thing = new Thing({
            size: 'large',
        });
        should.deepEqual(thing.describeProperty('guid'),
            immutable('guid'));
        should.deepEqual(thing.describeProperty('type'),
            mutable('type'));
        should.deepEqual(thing.describeProperty('id'),
            retroactive('id'));
        should.deepEqual(thing.describeProperty('size'),
            mutable('size'));
        should.deepEqual(thing.describeProperty('asdf'),
            unused('asdf'));
        should.deepEqual(thing.describeProperty('location'), 
            unused('location'));
        should.deepEqual(thing.describeProperty('color'),
            unused('color'));

        // create a temporal property
        thing.observe("location", "SFO");
        should.deepEqual(thing.describeProperty('location'),
            temporal('location'));

        // create retroactive property
        thing.observe("color", 'red', Observation.RETROACTIVE);
        should.deepEqual(thing.describeProperty('color'),
            retroactive('color'));

        // serialized thing has same property definitions
        var thing = new Thing(JSON.parse(JSON.stringify(thing)));
        should.deepEqual(thing.describeProperty('guid'),
            immutable('guid'));
        should.deepEqual(thing.describeProperty('type'),
            mutable('type'));
        should.deepEqual(thing.describeProperty('id'),
            retroactive('id'));
        should.deepEqual(thing.describeProperty('size'),
            mutable('size'));
        should.deepEqual(thing.describeProperty('asdf'),
            unused('asdf'));
        should.deepEqual(thing.describeProperty('location'),
            temporal('location'));
        should.deepEqual(thing.describeProperty('color'),
            retroactive('color'));
    });
    it("merge(thing1,thing2) two versions of same thing", function() {
        var t = [
            new Date(2018,11,1),
            new Date(2018,11,2),
            new Date(2018,11,3),
        ];
        var thing1 = new Thing({
            id: 'thing1',
            color: 'red1',
        });
        thing1.observe('inspected', true, t[0]);
        thing1.observe('inspected', true, t[1]);
        var thing2 = new Thing(Object.assign({}, thing1, {
            id: 'thing2',
            color: 'red2',
        }));
        thing2.observe('inspected', true, t[2]);

        var expected = new Thing(JSON.parse(JSON.stringify(thing2)));
        var etv = expected.obs.sort((a,b) => Observation.compare_t_tag(a,b));
        for (var i = 1; i < etv.length; i++) {
            should(Observation.compare_t_tag(etv[i-1],etv[i])).below(1);
        }
        var merged = Thing.merge(thing1,thing2);
        merged.obs.sort(Observation.compare_t_tag);
        should.deepEqual(merged.obs.map(tv=>tv.toString()), 
            expected.obs.map(tv=>tv.toString()));
        should.deepEqual(merged, expected);
    });

})
