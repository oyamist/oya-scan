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
            var msg = `${lhs}(${rhsData.map(d=>""+d)})`;
            this.reduced.push({lhs, rhs:rhsData});
            super.onReduce(lhs, rhsData);
            return msg;
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
    it("TESTTESTstep() consumes valid terminal sequence", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var tp = new TestParser({
            grammar,
        });
        var obs = 'abc'.split('').map((tag,i)=>new Observation(tag,i));

        var res = tp.observe(obs[0]);
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should(res).equal(true);

        var res = tp.observe(obs[1]);
        should.deepEqual(tp.state(), [ 'abc_2', 'root_0' ]);
        should.deepEqual(tp.reduced, []);
        should(res).equal(true);

        var res = tp.observe(obs[2]);
        should.deepEqual(tp.state(), []);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc', // first reduce
            rhs: [obs[0], obs[1], obs[2]],
        },{
            lhs: 'root', // final reduce
            rhs: ['abc(a:0,b:1,c:2)'],
        }]);
        should(res).equal(true);
    });
    it("step() rejects invalid terminal", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var tp = new TestParser({
            grammar,
        });
        var obs = 'axbc'.split('').map((tag,i)=>new Observation(tag,i));

        var res = tp.observe(obs[0]);
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should(res).equal(true);
        should.deepEqual(tp.shifted, [obs[0]]);

        var res = tp.observe(obs[1]);
        should(res).equal(false); // reject bad input
        should.deepEqual(tp.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(tp.rejected, [obs[1]]);
        should.deepEqual(tp.shifted, [obs[0]]);

        var res = tp.observe(obs[2]);
        should.deepEqual(tp.state(), [ 'abc_2', 'root_0' ]);
        should(res).equal(true);
        should.deepEqual(tp.shifted, [obs[0], obs[2]]);

        should.deepEqual(tp.reduced, []);
        var res = tp.observe(obs[3]);
        should.deepEqual(tp.state(), []);
        should(res).equal(true);
        should.deepEqual(tp.reduced, [{
            lhs: 'abc', // first reduce
            rhs: [obs[0], obs[2], obs[3]],
        },{
            lhs: 'root', // final reduce
            rhs: ['abc(a:0,b:2,c:3)'],
        }]);
        should.deepEqual(tp.shifted, [obs[0], obs[2], obs[3]]);
        should.deepEqual(tp.rejected, [obs[1]]);
    });
    it("step() consumes non-terminal sequence", ()=>{
        const grammar = {
            root: 'abab',
            abab: ['ab', 'ab'],
            ab: [ 'a', 'b' ],
        };
        var tp = new TestParser({
            grammar,
        });
        var obs = 'abab'.split('').map((tag,i)=>new Observation(tag,i));

        var i = 0;
        var res = tp.observe(obs[i++]);
        should.deepEqual(tp.state(), [ 'ab_1', 'abab_0', 'root_0' ]);
        should(res).equal(true);

        var res = tp.observe(obs[i++]);
        should.deepEqual(tp.state(), [ 'abab_1', 'root_0' ]);
        should(res).equal(true);
        should.deepEqual(tp.reduced, [{
            lhs: 'ab', // first reduce
            rhs: [obs[0], obs[1]],
        }]);

        var res = tp.observe(obs[i++]);
        should.deepEqual(tp.state(), [ 'ab_1', 'abab_1', 'root_0' ]);
        should.deepEqual(tp.reduced, [{
            lhs: 'ab', // first reduce
            rhs: [obs[0], obs[1]],
        }]);
        should(res).equal(true);

        var res = tp.observe(obs[i++]);
        should.deepEqual(tp.state(), []);
        console.log(`dbg stack`, tp.stack);
        should(res).equal(true);
        should.deepEqual(tp.reduced, [{
            lhs: 'ab', // first reduce
            rhs: [obs[0], obs[1]],
        },{
            lhs: 'ab', // second reduce
            rhs: [obs[2], obs[3]],
        },{
            lhs: 'abab', // nonterminal reduce
            rhs: ['ab(a:0,b:1)', 'ab(a:2,b:3)'],
        },{
            lhs: 'root', // final reduce
            rhs: ['abab(ab(a:0,b:1),ab(a:2,b:3))'],
        }]);
    });
    it("TESTTESTstep() consumes STAR sequence", ()=>{
        return; // TODO dbg
        const grammar = {
            root: 'abb',
            abb: ['ab',  STAR('b')], // ab{b}
            ab: ['a', 'b'], 
        };
        var tp = new TestParser({
            grammar,
            logLevel: 'info',
        });
        var obs = 'abb'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        var res = tp.observe(obs[i++]); // a
        should.deepEqual(tp.state(), [ 'ab_1', 'abb_0', 'root_0' ]);
        should(res).equal(true);

        var res = tp.observe(obs[i++]); // b
        should.deepEqual(tp.state(), [ 'abb_1', 'root_0' ]);
        should(res).equal(true);
        should.deepEqual(tp.reduced, [{
            lhs: 'ab', // first reduce
            rhs: [ obs[0], obs[1] ],
        }]);

//        return; // TODO dbg
        var res = tp.observe(obs[i++]); // b
        should.deepEqual(tp.state(), [ 'root_1' ]);
        should(res).equal(true);
        should.deepEqual(reduced, [{
            lhs: 'ab',
            rhs: [ obs[0], obs[1] ],
        },{
            lhs: 'abb',
            rhs: [ obs[0] ],
        }]);
    });

})
