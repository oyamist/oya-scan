(typeof describe === 'function') && describe("parser", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const { logger } = require('rest-bundle');
    const {
        Observation,
        Parser,
        Scanner,
    } = require('../index');
    const {
        ALT,
        OPT,
        STAR,
        PLUS,
    } = Parser;

    it("grammar helpers", ()=>{
        should.deepEqual(STAR("+","-"), {
            ebnf: "*",
            args: [ '+', '-'],
        });
        should.deepEqual(ALT("+","-"), {
            ebnf: "|",
            args: [ '+', '-'],
        });
        should.deepEqual(PLUS("+","-"), {
            ebnf: "+",
            args: [ '+', '-'],
        });
        should.deepEqual(OPT("+","-"), {
            ebnf: "?",
            args: [ '+', '-'],
        });
    });
    it("TESTTESTdefault ctor", ()=>{
        var parser = new Parser();
        should(parser).instanceOf(Parser);

        // default grammar
        var g = parser.grammar;
        should.deepEqual(g.root, ["expr"]);
        should.deepEqual(g.addOp, [ALT("+","-")]);
        should.deepEqual(g.expr, [
            OPT("addOp"), "term", STAR("addOp", "term"), ]);
        should.deepEqual(parser.nonTerminals, [
            "addOp",
            "expr",
            "root",
        ]);

        // default actions print to console
        should(typeof parser.reject).equal('function');
        should(typeof parser.shift).equal('function');
        should(typeof parser.reduce).equal('function');

        should.deepEqual(parser.state(), [ ]);
    });
    it("custom ctor", ()=>{
        const grammar = {
            root: "term",
            mulOp: ALT("*","/"),
            term: [ OPT("-"), "factor", STAR("mulOp", "factor")],
        }
        var parser = new Parser({
            grammar,
        });
        should(parser).instanceOf(Parser);
        should.deepEqual(parser.grammar.root, [grammar.root]); // canonical
        should.deepEqual(parser.grammar.expr, grammar.expr);
        should(JSON.stringify(parser.grammar.mulOp))
            .equal('[{"ebnf":"|","args":["*","/"]}]');
    });
    it("TESTTESTstep() consumes valid terminal sequence", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var reduced = [];
        var shifted = [];
        var rejected = [];
        var parser = new Parser({
            grammar,
            reduce: (lhs, rhs)=> {
                reduced.push({lhs, rhs});
                console.log(`test reduce(${lhs},[${rhs}]`);
                return `${lhs}-result`;
            },
            reject: ob=>rejected.push(ob),
            shift: ob=>shifted.push(ob),
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
    it("TESTTESTstep() rejects invalid terminal", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var reduced = [];
        var shifted = [];
        var rejected = [];
        var parser = new Parser({
            grammar,
            reduce: (lhs, rhs)=>{
                reduced.push({lhs, rhs});
                return `${lhs}-result`;
            },
            reject: ob=>rejected.push(ob),
            shift: ob=>shifted.push(ob),
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
    it("TESTTESTstep() consumes non-terminal sequence", ()=>{
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
            reduce: (lhs, rhs)=>{
                reduced.push({lhs, rhs});
                return `${lhs}-result${reduced.length}`;
            },
            reject: ob=>rejected.push(ob),
            shift: ob=>shifted.push(ob),
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
            lhs: 'abab', // nonTerminal reduce
            rhs: ['ab-result1', 'ab-result2'],
        },{
            lhs: 'root', // final reduce
            rhs: ['abab-result3'],
        }]);
    });
})
