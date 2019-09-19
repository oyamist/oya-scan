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
    } = Parser;

    it("grammar helpers", ()=>{
        should.deepEqual(STAR("+","-"), {
            op: "*",
            args: [ '+', '-'],
        });
        should.deepEqual(ALT("+","-"), {
            op: "|",
            args: [ '+', '-'],
        });
        should.deepEqual(OPT("+","-"), {
            op: "?",
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

        should.deepEqual(parser.state(), [ 'root_0' ]);
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
            .equal('[{"op":"|","args":["*","/"]}]');
    });
    it("TESTTESTstep() consumes valid terminal sequence", ()=>{
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var parser = new Parser({
            grammar,
        });
        var obs = 'abc'.split('').map(tag=>new Observation(tag));

        var res = parser.observe(obs[0]);
        should.deepEqual(parser.state(), [ 'abc_1', 'root_0' ]);
        should(res).equal(true);

        var res = parser.observe(obs[1]);
        should.deepEqual(parser.state(), [ 'abc_2', 'root_0' ]);
        should(res).equal(true);

        var res = parser.observe(obs[2]);
        should.deepEqual(parser.state(), [ 'root_1' ]);
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
            reduce: (nt, args)=>reduced.push({nt, args}),
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
        should.deepEqual(parser.state(), [ 'root_1' ]);
        should(res).equal(true);
        should.deepEqual(reduced, [{
            nt: 'abc',
            args: [obs[0], obs[2], obs[3]], // obs[1] was ignored
        }]);
        should.deepEqual(shifted, [obs[0], obs[2], obs[3]]);
        should.deepEqual(rejected, [obs[1]]);
    });
})
