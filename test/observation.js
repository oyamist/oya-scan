(typeof describe === 'function') && describe("observation", function() {
    const winston = require('winston');
    const should = require("should");
    const {
        Observation,
    } = require("../index");

    it("default ctor", function() {
        var obs = new Observation();
        should(obs.t).instanceOf(Date);
        should(Date.now() - obs.t).above(-1).below(5);
        should(obs.tag).equal(undefined);
        should(obs.value).equal(obs.t);
        should(obs.text).equal(undefined);
    });
    it("custom object ctor", function() {
        var t = new Date(2018, 3, 11);
        var tag = "color";
        var text = "some-annotation";
        var value = "purple";
        var obs2 = new Observation({
            t,
            tag,
            text,
            value,
        });
        should(obs2).properties({
            t,
            tag,
            text,
            value,
        });
    });
    it("custom positional ctor", function() {
        var t = new Date(2018, 3, 11);
        var tag = "color";
        var text = "some-annotation";
        var value = "purple";
        var obs2 = new Observation(tag, value, text, t);
        should(obs2).properties({
            t,
            tag,
            text,
            value,
        });
    });
    it("RETROACTIVE is the timestamp for retroactive values", function() {
        // Retroactive date is JS minimum date. So there.
        should(Observation.RETROACTIVE.toJSON()).equal("-271821-04-20T00:00:00.000Z");
    });
    it("Observations are serializable", function() {
        var t = new Date(2018,2,10,7,30,10);
        var tag = 'color';
        var value = 'purple';
        var o1 = new Observation(tag, value, null, t);
        var json = JSON.parse(JSON.stringify(o1));
        should.deepEqual(json, {
            t: t.toJSON(),
            tag,
            value,
        });

        var o2 = new Observation(json);
        should.deepEqual(o2, o1);
    });
    it("compare_t_tag(a,b) sorts by (t,tag)", function() {
        var t1 = Observation.RETROACTIVE;
        var t2 = new Date(2018,11,2);
        var o1_color = new Observation('color', 'purple', 'asdf', t1);
        var o2_color = new Observation('color', 'purple', 'asdf', t2);

        // t is primary sort key
        should(Observation.compare_t_tag(o1_color,o2_color)).equal(-1);
        should(Observation.compare_t_tag(o2_color,o1_color)).equal(1);
        should(Observation.compare_t_tag(o1_color,o1_color)).equal(0);

        // tag is secondary sort key
        var o1_size = new Observation('size', 'large', 'asdf', t1);
        should('color').below('size');
        should(Observation.compare_t_tag(o1_color,o1_size)).equal(-1);
        should(Observation.compare_t_tag(o1_size,o1_color)).equal(1);

        // other properties are ignored
        var o1_color_2 = new Observation('color', undefined, null, t1);
        should(Observation.compare_t_tag(o1_color,o1_color_2)).equal(0);
        should(Observation.compare_t_tag(o1_color_2,o1_color)).equal(0);

        var oa = [o1_size, o2_color, o1_size, o1_color, o1_color_2];
        oa.sort(Observation.compare_t_tag);
        should.deepEqual(oa, [ o1_color, o1_color_2, o1_size, o1_size, o2_color, ]);
    });
    it("mergeObservations(oa1,oa2) merges observation arrays", function() {
        var t = [
            new Date(2018,11,1),
            new Date(2018,11,2),
            new Date(2018,11,3),
            new Date(2018,11,4),
            new Date(2018,11,5),
            new Date(2018,11,6),
        ];
        var oa1 = [
            new Observation({t:t[0],text:'one'}),
            new Observation({t:t[1],text:'one'}),
            new Observation({t:t[3],text:'one'}),
            new Observation({t:t[4],text:'one'}),
        ];
        var oa2 = [
            new Observation({t:t[0],text:'two'}), // conflict with oa1[0]
            new Observation({t:t[2],text:'two'}),
        ];

        // The longer sequence is the primary sequence for conflicts
        should.deepEqual(Observation.mergeObservations(oa1, oa2), [
            oa1[0], oa1[1], oa2[1], oa1[2], oa1[3],
        ]);
        should.deepEqual(Observation.mergeObservations(oa2, oa1), [
            oa1[0], oa1[1], oa2[1], oa1[2], oa1[3],
        ]);

        // input sequences can be unordered
        var oa1_random = [
            new Observation({t:t[1],text:'one'}),
            new Observation({t:t[4],text:'one'}),
            new Observation({t:t[0],text:'one'}),
            new Observation({t:t[3],text:'one'}),
        ];
        var oa2_random = [
            new Observation({t:t[2],text:'two'}),
            new Observation({t:t[0],text:'two'}), // conflict with oa1[0]
        ];
        should.deepEqual(
            Observation.mergeObservations(oa1_random, oa2_random), 
            [ oa1[0], oa1[1], oa2[1], oa1[2], oa1[3] ]
        );
    });
    it("toString() overrides Object.toString()", function() {
        var t = new Date(Date.UTC(2018,11,2));
        var ob = new Observation('weight', 123, 'kg', t);
        should(`${ob}`).equal('weight:123 kg');
    });

})
