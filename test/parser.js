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

    class TestParser extends Parser {
        constructor(opts) {
            super(opts);
            this.reduced = [];
            this.shifted = [];
            this.rejected = [];
        }

        onReduce(lhs, rhsData) {
            this.reduced.push({lhs, rhsData});
            super.onReduce(lhs, rhsData);
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
    it("custom ctor", ()=>{
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
    it("TESTTESTobserve() consumes valid terminal sequence", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var tp = new TestParser({
            grammar,
            //logLevel: 'info',
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
    it("TESTTESTobserve() rejects invalid terminal", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var tp = new TestParser({
            grammar,
            //logLevel: 'info',
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
    it("TESTTESTobserve() consumes non-terminal sequence", ()=>{
        const grammar = {
            root: 'abab',
            abab: ['ab', 'ab'],
            ab: [ 'a', 'b' ],
        };
        var tp = new TestParser({
            grammar,
            //logLevel: 'info',
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
        console.log(`dbg stack`, tp.stack);
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
    it("TESTTESTobserve() consumes empty STAR terminal", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', STAR('b'), 'c'], 
            },
            //logLevel: 'info',
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
    it("TESTTESTobserve() consumes STAR terminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', STAR('b'), 'c'], 
            },
            //logLevel: 'info',
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
    it("TESTTESTobserve() consumes trailing STAR terminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', STAR('b')], 
            },
            //logLevel: 'info',
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
    it("TESTTESTobserve() consumes empty STAR nonterminal", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'abc',
                abc: ['a', STAR('B'), 'c'], 
                B: 'b',
            },
            //logLevel: 'info',
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
    it("TESTTESTobserve() consumes STAR nonterminals ", ()=>{
        var tp = new TestParser({
            grammar: {
                root: 'aBc',
                aBc: ['a', STAR('B'), 'c'], 
                B: 'b',
            },
            logLevel: 'info',
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

})