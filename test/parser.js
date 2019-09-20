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
    it("step() consumes valid terminal sequence", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var reduced = [];
        var shifted = [];
        var rejected = [];
        var parser = new Parser({
            grammar,
            onReduce: (lhs, rhs)=> {
                reduced.push({lhs, rhs});
                console.log(`test reduce(${lhs},[${rhs}]`);
                return `${lhs}-result`;
            },
            onReject: ob=>rejected.push(ob),
            onShift: ob=>shifted.push(ob),
        });
        var obs = 'abc'.split('').map((tag,i)=>new Observation(tag,i));

        var res = parser.observe(obs[0]);
        should.deepEqual(parser.state(), [ 'abc_1', 'root_0' ]);
        should(res).equal(true);

        var res = parser.observe(obs[1]);
        should.deepEqual(parser.state(), [ 'abc_2', 'root_0' ]);
        should.deepEqual(reduced, []);
        should(res).equal(true);

        var res = parser.observe(obs[2]);
        should.deepEqual(parser.state(), []);
        should.deepEqual(reduced, [{
            lhs: 'abc', // first reduce
            rhs: [obs[0], obs[1], obs[2]],
        },{
            lhs: 'root', // final reduce
            rhs: ['abc-result'],
        }]);
        should(res).equal(true);
    });
    it("step() rejects invalid terminal", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var reduced = [];
        var shifted = [];
        var rejected = [];
        var parser = new Parser({
            grammar,
            onReduce: (lhs, rhs)=>{
                reduced.push({lhs, rhs});
                return `${lhs}-result`;
            },
            onReject: ob=>rejected.push(ob),
            onShift: ob=>shifted.push(ob),
        });
        var obs = 'axbc'.split('').map(tag=>new Observation(tag));

        var res = parser.observe(obs[0]);
        should.deepEqual(parser.state(), [ 'abc_1', 'root_0' ]);
        should(res).equal(true);
        should.deepEqual(shifted, [obs[0]]);

        var res = parser.observe(obs[1]);
        should(res).equal(false); // reject bad input
        should.deepEqual(parser.state(), [ 'abc_1', 'root_0' ]);
        should.deepEqual(rejected, [obs[1]]);
        should.deepEqual(shifted, [obs[0]]);

        var res = parser.observe(obs[2]);
        should.deepEqual(parser.state(), [ 'abc_2', 'root_0' ]);
        should(res).equal(true);
        should.deepEqual(shifted, [obs[0], obs[2]]);

        should.deepEqual(reduced, []);
        var res = parser.observe(obs[3]);
        should.deepEqual(parser.state(), []);
        should(res).equal(true);
        should.deepEqual(reduced, [{
            lhs: 'abc', // first reduce
            rhs: [obs[0], obs[2], obs[3]],
        },{
            lhs: 'root', // final reduce
            rhs: ['abc-result'],
        }]);
        should.deepEqual(shifted, [obs[0], obs[2], obs[3]]);
        should.deepEqual(rejected, [obs[1]]);
    });
    it("step() consumes non-terminal sequence", ()=>{
        const grammar = {
            root: 'abab',
            abab: ['ab', 'ab'],
            ab: [ 'a', 'b' ],
        };
        var reduced = [];
        var shifted = [];
        var rejected = [];
        var parser = new Parser({
            grammar,
            onReduce: (lhs, rhs)=>{
                reduced.push({lhs, rhs});
                return `${lhs}-result${reduced.length}`;
            },
            onReject: ob=>rejected.push(ob),
            onShift: ob=>shifted.push(ob),
        });
        var obs = 'abab'.split('').map(tag=>new Observation(tag));

        var i = 0;
        var res = parser.observe(obs[i++]);
        should.deepEqual(parser.state(), [ 'ab_1', 'abab_0', 'root_0' ]);
        should(res).equal(true);

        var res = parser.observe(obs[i++]);
        should.deepEqual(parser.state(), [ 'abab_1', 'root_0' ]);
        should(res).equal(true);
        should.deepEqual(reduced, [{
            lhs: 'ab', // first reduce
            rhs: [obs[0], obs[1]],
        }]);

        var res = parser.observe(obs[i++]);
        should.deepEqual(parser.state(), [ 'ab_1', 'abab_1', 'root_0' ]);
        should.deepEqual(reduced, [{
            lhs: 'ab', // first reduce
            rhs: [obs[0], obs[1]],
        }]);
        should(res).equal(true);

        var res = parser.observe(obs[i++]);
        should.deepEqual(parser.state(), []);
        console.log(`dbg parser.stack`, parser.stack);
        should(res).equal(true);
        should.deepEqual(reduced, [{
            lhs: 'ab', // first reduce
            rhs: [obs[0], obs[1]],
        },{
            lhs: 'ab', // second reduce
            rhs: [obs[2], obs[3]],
        },{
            lhs: 'abab', // nonterminal reduce
            rhs: ['ab-result1', 'ab-result2'],
        },{
            lhs: 'root', // final reduce
            rhs: ['abab-result3'],
        }]);
    });
    it("TESTTESTstep() consumes STAR sequence", ()=>{
        //return; // TODO dbg
        const grammar = {
            root: 'abb',
            abb: ['ab',  STAR('b')], // ab{b}
            ab: ['a', 'b'], 
        };
        var reduced = [];
        var shifted = [];
        var rejected = [];
        var parser = new Parser({
            grammar,
            onReduce: (lhs, rhs)=>{
                reduced.push({lhs, rhs});
                console.log(`dbg reduce ${lhs} => [${rhs}]`);
                if (lhs === 'ab') {
                    return rhs[0];
                }
                if (lhs === 'abb') {
                    return `now what`;
                }
                return rhs[0];
            },
            onReject: ob=>rejected.push(ob),
            onShift: ob=>shifted.push(ob),
        });
        var obs = 'abb'.split('').map((tag,i)=>new Observation(tag,i));
        var i = 0;

        var res = parser.observe(obs[i++]);
        should.deepEqual(parser.state(), [ 'ab_1', 'abb_0', 'root_0' ]);
        should(res).equal(true);

        var res = parser.observe(obs[i++]);
        should.deepEqual(parser.state(), [ 'abb_1', 'root_0' ]);
        should(res).equal(true);
        should.deepEqual(reduced, [{
            lhs: 'ab', // first reduce
            rhs: [ obs[0], obs[1] ],
        }]);

        return; // TODO dbg
        var res = parser.observe(obs[i++]);
        should.deepEqual(parser.state(), [ ]);
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
