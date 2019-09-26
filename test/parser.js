(typeof describe === 'function') && describe("parser", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const { logger } = require('rest-bundle');
    const {
        Grammar,
        Observation,
        Parser,
        Scanner,
    } = require('../index');
    const {
        ALT,
        OPT,
        STAR,
        PLUS,
    } = Grammar;
    const logLevel = false;

    class TestParser extends Parser {
        constructor(opts) {
            super(opts);
        }

        clearAll() {
            super.clearAll();
            this.reduced = [];
            this.shifted = [];
            this.rejected = [];
        }

        onReduce(tos) {
            this.reduced.push({
                lhs: tos.lhs,
                rhsData: tos.rhsData,
            });
            super.onReduce(tos);
        }

        onShift(ob) {
            this.shifted.push(ob);
            return super.onShift(ob);
        }

        onReject(ob) {
            this.rejected.push(ob);
            return super.onReject(ob);
        }
    };

    it("default ctor", ()=>{
        var parser = new Parser();
        should(parser).instanceOf(Parser);

        // default grammar
        var g = parser.grammar;
        should(g).instanceOf(Grammar);

        // customizable actions print to console by default
        should(typeof parser.onReject).equal('function');
        should(typeof parser.onShift).equal('function');
        should(typeof parser.onReduce).equal('function');

        should.deepEqual(parser.state(), [ ]);
    });
    it("TESTTESTcustom ctor", ()=>{
        const gdef = {
            root: "term",
            mulOp: ALT("*","/"),
            term: [ OPT("-"), "factor", STAR("mulOp", "factor")],
        }

        // Parser creates grammar copy
        const grammar = new Grammar(gdef);
        var parser = new Parser({
            grammar: gdef, // custom grammar JSON
        });
        should.deepEqual(parser.grammar, grammar);
        var parser = new Parser({
            grammar,
        });
        should.deepEqual(parser.grammar, grammar);
        should(parser.grammar).not.equal(grammar); 

    });
    it("isParsing() false at empty state", ()=> {
        const grammar = {
            root: 'ab',
            ab: [ 'a', 'b' ],
        };
        var tp = new TestParser({
            grammar,
            logLevel,
        });
        var obs = 'ab'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;
        should(tp.isParsing).equal(false);
        should(tp.observe(obs[i++])).equal(true); // a
        should(tp.isParsing).equal(true);
        should(tp.observe(obs[i++])).equal(true); // b
        should(tp.isParsing).equal(false);
    });
    it("observe() consumes valid terminal sequence", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var tp = new TestParser({
            grammar,
            logLevel,
        });
        var obs = 'abc'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_2', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc', // first reduce
            rhsData: [obs[0], obs[1], obs[2]],
        },{
            lhs: 'root', // final reduce
            rhsData: [[obs[0], obs[1], obs[2]]],
        }]);
    });
    it("observe() rejects invalid terminal", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var tp = new TestParser({
            grammar,
            logLevel,
        });
        var obs = 'axbc'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;


        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0]]);

        should(tp.observe(obs[i++])).equal(false); // x reject
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.rejected, [obs[1]]);
        should.deepEqual(tp.shifted, [obs[0]]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_2', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0], obs[2]]);

        should.deepEqual(tp.reduced, []);
        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc', // first reduce
            rhsData: [obs[0], obs[2], obs[3]],
        },{
            lhs: 'root', // final reduce
            rhsData: [[obs[0], obs[2], obs[3]]],
        }]);
        should.deepEqual(tp.shifted, [obs[0], obs[2], obs[3]]);
        should.deepEqual(tp.rejected, [obs[1]]);
    });
    it("observe() consumes non-terminal sequence", ()=>{
        const grammar = {
            root: 'abab',
            abab: ['ab', 'ab'],
            ab: [ 'a', 'b' ],
        };
        var tp = new TestParser({
            grammar,
            logLevel,
        });
        var obs = 'abab'.split('').map((tag,i)=>new Observation(tag,i));

        var i = 0;
        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'ab_1', 'abab_0', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abab_1', 'root_0' ]);
        should.deepEqual(tp.reduced, [{
            lhs: 'ab', // first reduce
            rhsData: [obs[0], obs[1]],
        }]);

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'ab_1', 'abab_1', 'root_0' ]);
        should.deepEqual(tp.reduced, [{
            lhs: 'ab', // first reduce
            rhsData: [obs[0], obs[1]],
        }]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'ab', // first reduce
            rhsData: [obs[0], obs[1]],
        },{
            lhs: 'ab', // second reduce
            rhsData: [obs[2], obs[3]],
        },{
            lhs: 'abab', // nonterminal reduce
            rhsData: [[obs[0], obs[1]], [obs[2], obs[3]]],
        },{
            lhs: 'root', // final reduce
            rhsData: [[[obs[0], obs[1]], [obs[2], obs[3]]]],
        }]);
    });
    it("observe() consumes empty STAR terminal", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', STAR('b'), 'c'], 
            },
            logLevel,
        });
        var obs = 'ac'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc',
            rhsData: [ obs[0], [], obs[1], ],
        },{
            lhs: 'root',
            rhsData: [[ obs[0], [], obs[1], ]],
        }]);
    });
    it("observe() consumes STAR terminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', STAR('b'), 'c'], 
            },
            logLevel,
        });
        var obs = 'abbc'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc',
            rhsData: [ obs[0], [obs[1], obs[2]], obs[3] ],
        },{
            lhs: 'root',
            rhsData: [[ obs[0], [obs[1], obs[2]], obs[3] ]],
        }]);
    });
    it("observe() consumes trailing STAR terminals ", ()=>{
        // Rules with trailing STARs should be avoided since
        // they have no termination
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', STAR('b')], 
            },
            logLevel,
        });
        var obs = 'abb'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0]]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0],obs[1]]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);
        should.deepEqual(tp.shifted, [obs[0],obs[1],obs[2]]);
    });
    it("observe() consumes empty STAR nonterminal", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', STAR('B'), 'c'], 
                B: 'b',
            },
            logLevel,
        });
        var obs = 'ac'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc',
            rhsData: [ obs[0], [], obs[1], ],
        },{
            lhs: 'root',
            rhsData: [[ obs[0], [], obs[1], ]],
        }]);
    });
    it("observe() consumes STAR nonterminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'aBc',
                aBc: ['a', STAR('B'), 'c'], 
                B: 'b',
            },
            logLevel,
        });
        var obs = 'abbc'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, [{
            lhs:'B',
            rhsData: [obs[1]],
        },{
            lhs:'B',
            rhsData: [obs[2]],
        }]);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced[0], {
            lhs: 'B',
            rhsData: [ obs[1] ],
        });
        should.deepEqual(tp.reduced[1], {
            lhs: 'B',
            rhsData: [ obs[2] ],
        });
        should.deepEqual(tp.reduced[2], {
            lhs: 'aBc',
            rhsData: [ obs[0], [[obs[1]], [obs[2]]], obs[3] ],
        });
        should.deepEqual(tp.reduced[3], {
            lhs: 'root',
            rhsData: [[ obs[0], [[obs[1]], [obs[2]]], obs[3] ]],
        });
    });
    it("observe() consumes trailing STAR nonterminals ", ()=>{
        // Rules with trailing STARs should be avoided since
        // they have no termination
        var tp = new TestParser({
            grammar: {
                root: 'aBc',
                aBc: ['a', STAR('B')], 
                B: 'b',
            },
            logLevel,
        });
        var obs = 'abb'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0]]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0],obs[1]]);
        should.deepEqual(tp.reduced[0], {
            lhs: 'B',
            rhsData: [ obs[1] ],
        });
        should(tp.reduced.length).equal(1);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);
        should.deepEqual(tp.reduced[1], {
            lhs: 'B',
            rhsData: [ obs[2] ],
        });
        should(tp.reduced.length).equal(2);
        should.deepEqual(tp.shifted, [obs[0],obs[1],obs[2]]);
    });
    it("observe() rejects empty PLUS terminal", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', PLUS('b'), 'c'], 
            },
            logLevel,
        });
        var obs = 'ac'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(false); // c
        should.deepEqual(tp.state(), ['abc_1', 'root_0']);
        should.deepEqual(tp.reduced, []);
    });
    it("observe() consumes PLUS terminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', PLUS('b'), 'c'], 
            },
            logLevel,
        });
        var obs = 'abbc'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc',
            rhsData: [ obs[0], [obs[1], obs[2]], obs[3] ],
        },{
            lhs: 'root',
            rhsData: [[ obs[0], [obs[1], obs[2]], obs[3] ]],
        }]);
    });
    it("observe() consumes trailing PLUS terminals ", ()=>{
        // Rules with trailing PLUS should be avoided since
        // they have no termination
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', PLUS('b')], 
            },
            logLevel,
        });
        var obs = 'abb'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0]]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0],obs[1]]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);
        should.deepEqual(tp.shifted, [obs[0],obs[1],obs[2]]);
    });
    it("observe() consumes empty PLUS nonterminal", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', PLUS('B'), 'c'], 
                B: 'b',
            },
            logLevel,
        });
        var obs = 'ac'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(false); // c
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);
    });
    it("observe() consumes PLUS nonterminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'aBc',
                aBc: ['a', PLUS('B'), 'c'], 
                B: 'b',
            },
            logLevel,
        });
        var obs = 'abbc'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, [{
            lhs:'B',
            rhsData: [obs[1]],
        },{
            lhs:'B',
            rhsData: [obs[2]],
        }]);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced[0], {
            lhs: 'B',
            rhsData: [ obs[1] ],
        });
        should.deepEqual(tp.reduced[1], {
            lhs: 'B',
            rhsData: [ obs[2] ],
        });
        should.deepEqual(tp.reduced[2], {
            lhs: 'aBc',
            rhsData: [ obs[0], [[obs[1]], [obs[2]]], obs[3] ],
        });
        should.deepEqual(tp.reduced[3], {
            lhs: 'root',
            rhsData: [[ obs[0], [[obs[1]], [obs[2]]], obs[3] ]],
        });
    });
    it("observe() consumes trailing PLUS nonterminals ", ()=>{
        // Rules with trailing STARs should be avoided since
        // they have no termination
        var tp = new TestParser({
            grammar: {
                root: 'aBc',
                aBc: ['a', STAR('B')], 
                B: 'b',
            },
            logLevel,
        });
        var obs = 'abb'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0]]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0],obs[1]]);
        should.deepEqual(tp.reduced[0], {
            lhs: 'B',
            rhsData: [ obs[1] ],
        });
        should(tp.reduced.length).equal(1);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);
        should.deepEqual(tp.reduced[1], {
            lhs: 'B',
            rhsData: [ obs[2] ],
        });
        should(tp.reduced.length).equal(2);
        should.deepEqual(tp.shifted, [obs[0],obs[1],obs[2]]);
    });
    it("observe() consumes empty OPT terminal", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', OPT('b'), 'c'], 
            },
            logLevel,
        });
        var obs = 'ac'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc',
            rhsData: [ obs[0], [], obs[1], ],
        },{
            lhs: 'root',
            rhsData: [[ obs[0], [], obs[1], ]],
        }]);
    });
    it("observe() consumes OPT terminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', OPT('b'), 'c'], 
            },
            logLevel,
        });
        var obs = 'abc'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_2', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc',
            rhsData: [ obs[0], [obs[1]], obs[2] ],
        },{
            lhs: 'root',
            rhsData: [[ obs[0], [obs[1]], obs[2] ]],
        }]);
    });
    it("observe() rejects excessive OPT terminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', OPT('b'), 'c'], 
            },
            logLevel,
        });
        var obs = 'abbc'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'abc_2', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(false); // b
        should.deepEqual(tp.state(), [ 'abc_2', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced[0], {
            lhs: 'abc',
            rhsData: [ obs[0], [obs[1]], obs[3] ],
        });
        should.deepEqual(tp.reduced[1], {
            lhs: 'root',
            rhsData: [[ obs[0], [obs[1]], obs[3] ]],
        });
    });
    it("observe() consumes trailing OPT terminals ", ()=>{
        // Rules with trailing OPT should be avoided since
        // they have no termination
        var tp = new TestParser({
            grammar: {
                root: 'ab',
                ab: ['a', OPT('b')], 
            },
            logLevel,
        });
        var obs = 'ab'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'ab_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0]]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ ]);
        should.deepEqual(tp.reduced[0], {
            lhs: 'ab',
            rhsData: [obs[0], [obs[1]] ],
        });
        should.deepEqual(tp.reduced[1], {
            lhs: 'root',
            rhsData: [[obs[0], [obs[1]] ]],
        });
        should.deepEqual(tp.shifted, [obs[0],obs[1]]);
    });
    it("observe() rejects excessive trailing OPT terminals ", ()=>{
        // Rules with trailing OPT should be avoided since
        // they have no termination
        var tp = new TestParser({
            grammar: {
                root: 'ab',
                ab: ['a', OPT('b')], 
            },
            logLevel,
        });
        var obs = 'abb'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'ab_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0]]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ ]);
        should.deepEqual(tp.shifted, [obs[0],obs[1]]);
        should.deepEqual(tp.reduced[0], {
            lhs: 'ab',
            rhsData: [ obs[0], [obs[1]] ],
        });
        should.deepEqual(tp.reduced[1], {
            lhs: 'root',
            rhsData: [[ obs[0], [obs[1]] ]],
        });

        should(tp.observe(obs[i++])).equal(false); // b
        should.deepEqual(tp.state(), [ 'ab_0', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0],obs[1]]);
    });
    it("observe() consumes empty OPT nonterminal", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', OPT('B'), 'c'], 
                B: 'b',
            },
            logLevel,
        });
        var obs = 'ac'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc',
            rhsData: [ obs[0], [], obs[1], ],
        },{
            lhs: 'root',
            rhsData: [[ obs[0], [], obs[1], ]],
        }]);
    });
    it("observe() consumes OPT nonterminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'aBc',
                aBc: ['a', OPT('B'), 'c'], 
                B: 'b',
            },
            logLevel,
        });
        var obs = 'abc'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);
        should.deepEqual(tp.reduced, []);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'aBc_2', 'root_0' ]);
        should.deepEqual(tp.reduced, [{
            lhs:'B',
            rhsData: [obs[1]],
        }]);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'B',
            rhsData: [ obs[1] ],
        },{
            lhs: 'aBc',
            rhsData: [ obs[0], [[ obs[1] ]], obs[2] ],
        },{
            lhs: 'root',
            rhsData: [[ obs[0], [[ obs[1] ]], obs[2] ]],
        }]);
    });
    it("observe() rejects excessive OPT nonterminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'aBc',
                aBc: ['a', OPT('B'), 'c'], 
                B: 'b',
            },
            logLevel,
        });
        var obs = 'abbc'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'aBc_1', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ 'aBc_2', 'root_0' ]);

        should(tp.observe(obs[i++])).equal(false); // b
        should.deepEqual(tp.state(), [ 'aBc_2', 'root_0' ]);
        should.deepEqual(tp.reduced, [{
            lhs:'B',
            rhsData: [obs[1]],
        }]);

        should(tp.observe(obs[i++])).equal(true); // c
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced[0], {
            lhs: 'B',
            rhsData: [ obs[1] ],
        });
        should.deepEqual(tp.reduced[1], {
            lhs: 'aBc',
            rhsData: [ obs[0], [[ obs[1] ]], obs[3] ],
        });
        should.deepEqual(tp.reduced[2], {
            lhs: 'root',
            rhsData: [[ obs[0], [[ obs[1] ]], obs[3] ]],
        });
    });
    it("observe() consumes trailing OPT nonterminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'aB',
                aB: ['a', OPT('B')], 
                B: 'b',
            },
            logLevel,
        });
        var obs = 'abb'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'aB_1', 'root_0' ]);
        should.deepEqual(tp.shifted, [obs[0]]);

        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ ]);
        should.deepEqual(tp.shifted, [obs[0],obs[1]]);
        should.deepEqual(tp.reduced[0], {
            lhs: 'B',
            rhsData: [ obs[1] ],
        });
        should.deepEqual(tp.reduced[1], {
            lhs: 'aB',
            rhsData: [ obs[0], [[ obs[1] ]] ],
        });
        should.deepEqual(tp.reduced[2], {
            lhs: 'root',
            rhsData: [[ obs[0], [[ obs[1] ]] ]],
        });
        should(tp.reduced.length).equal(3);

        should(tp.observe(obs[i++])).equal(false); // b
        should.deepEqual(tp.state(), [ 'aB_0', 'root_0' ]);
        should(tp.reduced.length).equal(3);
        should.deepEqual(tp.shifted, [obs[0],obs[1]]);
    });
    it("observe() consumes ALT terminals", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'aBCd',
                aBCd: ['a', ALT('b','c'), 'd'], 
            },
            logLevel,
        });
        var test = (text) => {
            var obs = text.split('').map((tag,i)=>new Observation(tag,i));
            var i = 0;

            tp.clearAll();
            should(tp.observe(obs[i++])).equal(true); // a
            should.deepEqual(tp.state(), [ 'aBCd_1', 'root_0' ]);
            should.deepEqual(tp.reduced, []);

            should(tp.observe(obs[i++])).equal(true); // b
            should.deepEqual(tp.state(), [ 'aBCd_2', 'root_0' ]);
            should.deepEqual(tp.reduced, []);

            should(tp.observe(obs[i++])).equal(true); // d
            should.deepEqual(tp.state(), [ ]);
            should.deepEqual(tp.reduced[0], {
                lhs: 'aBCd',
                rhsData: [ obs[0], obs[1], obs[2] ],
            });
            should.deepEqual(tp.reduced[1], {
                lhs: 'root',
                rhsData: [[ obs[0], obs[1], obs[2] ]],
            });
            should(tp.reduced.length).equal(2);
        }

        test('abd');
        test('acd');
    });
    it("observe() rejects invalid ALT terminals", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'aBCd',
                aBCd: ['a', ALT('b','c'), 'd'], 
            },
            logLevel,
        });
        var test = (text) => {
            var obs = text.split('').map((tag,i)=>new Observation(tag,i));
            var i = 0;

            tp.clearAll();
            should(tp.observe(obs[i++])).equal(true); // a
            should.deepEqual(tp.state(), [ 'aBCd_1', 'root_0' ]);
            should.deepEqual(tp.reduced, []);

            should(tp.observe(obs[i++])).equal(false); // x
            should.deepEqual(tp.state(), [ 'aBCd_1', 'root_0' ]);
            should.deepEqual(tp.reduced, []);

            // recover with good input
            should(tp.observe(obs[i++])).equal(true); // c
            should.deepEqual(tp.state(), [ 'aBCd_2', 'root_0' ]);
            should.deepEqual(tp.reduced, []);

            should(tp.observe(obs[i++])).equal(true); // d
            should.deepEqual(tp.state(), [ ]);
            should.deepEqual(tp.reduced[0], {
                lhs: 'aBCd',
                rhsData: [ obs[0], obs[2], obs[3] ],
            });
            should.deepEqual(tp.reduced[1], {
                lhs: 'root',
                rhsData: [[ obs[0], obs[2], obs[3] ]],
            });
            should(tp.reduced.length).equal(2);
        }

        test('axcd');
    });
    it("TESTTESTobserve() consumes ALT nonterminals", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'aBCd',
                aBCd: ['a', ALT('B','C'), 'd'], 
                B: 'b',
                C: 'c',
            },
            logLevel: 'info',
        });
        var test = (text, ntAlt) => {
            var obs = text.split('').map((tag,i)=>new Observation(tag,i));
            var i = 0;

            tp.clearAll();
            should(tp.observe(obs[i++])).equal(true); // a
            should.deepEqual(tp.state(), [ 'aBCd_1', 'root_0' ]);
            should.deepEqual(tp.reduced, []);

            should(tp.observe(obs[i++])).equal(true); // b
            should.deepEqual(tp.state(), [ 'aBCd_2', 'root_0' ]);
            should.deepEqual(tp.reduced, [{
                lhs: ntAlt,
                rhsData: [ obs[1] ],
            }]);

            should(tp.observe(obs[i++])).equal(true); // d
            should.deepEqual(tp.state(), [ ]);
            should.deepEqual(tp.reduced[1], {
                lhs: 'aBCd',
                rhsData: [ obs[0], [obs[1]], obs[2] ],
            });
            should.deepEqual(tp.reduced[2], {
                lhs: 'root',
                rhsData: [[ obs[0], [obs[1]], obs[2] ]],
            });
            should(tp.reduced.length).equal(3);
        }

        test('abd', 'B');
        test('acd', 'C');
    });
    it("observe() rejects ALT nonterminals", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'aBCd',
                aBCd: ['a', ALT('B','C'), 'd'], 
                B: 'b',
                C: 'c',
            },
            logLevel,
        });
        var test = (text, ntAlt) => {
            var obs = text.split('').map((tag,i)=>new Observation(tag,i));
            var i = 0;

            tp.clearAll();
            should(tp.observe(obs[i++])).equal(true); // a
            should.deepEqual(tp.state(), [ 'aBCd_1', 'root_0' ]);
            should.deepEqual(tp.reduced, []);

            should(tp.observe(obs[i++])).equal(false); // x
            should.deepEqual(tp.state(), [ 'aBCd_1', 'root_0' ]);
            should.deepEqual(tp.reduced, []);

            should(tp.observe(obs[i++])).equal(true); // b
            should.deepEqual(tp.state(), [ 'aBCd_2', 'root_0' ]);
            should.deepEqual(tp.reduced, [{
                lhs: ntAlt,
                rhsData: [ obs[2] ],
            }]);

            should(tp.observe(obs[i++])).equal(true); // d
            should.deepEqual(tp.state(), [ ]);
            should.deepEqual(tp.reduced[1], {
                lhs: 'aBCd',
                rhsData: [ obs[0], [obs[2]], obs[3] ],
            });
            should.deepEqual(tp.reduced[2], {
                lhs: 'root',
                rhsData: [[ obs[0], [obs[2]], obs[3] ]],
            });
            should(tp.reduced.length).equal(3);
        }

        test('axbd', 'B');
        test('axcd', 'C');
    });
    it("observe() repeated error is accepted", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'ab',
                ab: ['a', 'b'],
            },
            logLevel,
        });
        var obs = [
            new Observation('a','1','g'),  // mistaken input
            new Observation('a','1','oz'), // intended input (rejected)
            new Observation('a','1','oz'), // intended input (again)
            new Observation('b','1','oz'), // intended input
        ];
        var i = 0;

        should(tp.observe(obs[i++])).equal(true); // a
        should.deepEqual(tp.state(), [ 'ab_1', 'root_0' ]);
        should(tp.isParsing).equal(true);

        // first error is discarded awaiting correct input
        should(tp.observe(obs[i++])).equal(false); // reject
        should(tp.obError).equal(obs[1]);
        should(tp.isParsing).equal(true);

        // repeated error clears parser 
        should(tp.observe(obs[i++])).equal(true); // accept
        should.deepEqual(tp.state(), [ 'ab_1', 'root_0' ]);
        should(tp.obError).equal(undefined);
        should(tp.isParsing).equal(true);

        // parsing resumes
        should(tp.observe(obs[i++])).equal(true); // b
        should.deepEqual(tp.state(), [ ]);
        should(tp.isParsing).equal(false);
    });

})
