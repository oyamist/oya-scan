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

    it("TESTTESTgrammar helpers", ()=>{
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

    });
    it("TESTTESTcustom ctor", ()=>{
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
        should.deepEqual(parser.state(), [ 'root_0' ]);

        var res = parser.observe(new Observation('a'));
        should.deepEqual(parser.state(), [ 'abc_1', 'root_0' ]);
        should(res).equal(true);

        var res = parser.observe(new Observation('b'));
        should.deepEqual(parser.state(), [ 'abc_2', 'root_0' ]);
        should(res).equal(true);

        var res = parser.observe(new Observation('c'));
        should.deepEqual(parser.state(), [ 'root_1' ]);
        should(res).equal(true);
    });
    it("TESTTESTstep() consumes invalid terminal sequence", ()=>{
        return; // dbg TODO
        const grammar = {
            root: 'abc',
            abc: [ 'a', 'b', 'c' ],
        };
        var parser = new Parser({
            grammar,
        });
        should.deepEqual(parser.state(), [ 'root_0' ]);

        var res = parser.observe(new Observation('a'));
        should.deepEqual(parser.state(), [ 'abc_1', 'root_0' ]);
        should(res).equal(true);

        var res = parser.observe(new Observation('x'));
        should.deepEqual(parser.state(), [ 'abc_1', 'root_0' ]);
        should(res).equal(false);

        var res = parser.observe(new Observation('b'));
        should.deepEqual(parser.state(), [ 'abc_2', 'root_0' ]);
        should(res).equal(true);

        var res = parser.observe(new Observation('c'));
        should.deepEqual(parser.state(), [ 'root_1' ]);
        should(res).equal(true);
    });
})
