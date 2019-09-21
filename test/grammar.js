(typeof describe === 'function') && describe("grammar", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const { logger } = require('rest-bundle');
    const {
        Grammar,
    } = require('../index');
    const {
        ALT,
        OPT,
        STAR,
        PLUS,
    } = Grammar;

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
    it("default ctor", ()=>{
        var g = new Grammar();
        should(g).instanceOf(Grammar);
        should.deepEqual(g.root, ["expr"]);
        should.deepEqual(g.addOp, [ALT("+","-")]);
        should.deepEqual(g.expr, [ 
            OPT("addOp"), 
            "term", 
            STAR("expr@2"), // generated
        ]);
        should.deepEqual(g[`expr@2`], // generated
            [ "addOp", "term" ]); 
        should.deepEqual(Object.keys(g).sort(), [
            "addOp",
            "expr",
            "expr@2", // generated for STAR("addOp", "term")
            "root",
        ].sort());
    });
    it("custom ctor", ()=>{
        const gdef = {
            root: "term",
            mulOp: ALT("*","/"),
            term: [ OPT("-"), "factor", STAR("mulOp", "factor")],
        }
        var g = new Grammar(gdef);
        should.deepEqual(g.root, [gdef.root]); // canonical
        should.deepEqual(g.expr, gdef.expr);
        should(JSON.stringify(g.mulOp))
            .equal('[{"ebnf":"|","args":["*","/"]}]');
    });
    it("grammar with STAR is expanded", ()=>{
        const gdef = {
            root: 'ab',
            ab: ['a', STAR('b','c')], // a { b c }
        };
        var g = new Grammar(gdef);

        // rewrite grammar for monadic STAR 
        should.deepEqual(g['root'], ["ab"]);
        should.deepEqual(g['ab'], ['a', STAR('ab@1')]);
        should.deepEqual(g['ab@1'], ['b', 'c']);
        should.deepEqual(Object.keys(g).sort(), 
            [ "root", "ab", "ab@1", ].sort());
    });
})
