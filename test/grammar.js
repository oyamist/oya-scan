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
        const a = "a";
        const b = "b";
        const c = "c";
        should.deepEqual(STAR(a), {
            ebnf: "*",
            args: [ a ],
        });
        should.deepEqual(STAR(a,b,c), {
            ebnf: "*",
            args: [ a, b, c ],
        });
        should.deepEqual(ALT(a,[b,c]), {
            ebnf: "|",
            args: [ a, [b,c]],
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
        should.deepEqual(g.mulop, gdef.mulop);
        should.deepEqual(g.term, [
            OPT("-"),
            "factor",
            STAR("term@2"),
        ]);
        should.deepEqual(g["term@2"], [ "mulOp", "factor", ]);
        should(JSON.stringify(g.mulOp))
            .equal('[{"ebnf":"|","args":["*","/"]}]');
    });
    it("invalid grammars", () => {
        const a = 'a';
        const b = 'b';
        const c = 'c';
        should.throws(() => {
            var g = new Grammar({
                // no rules
            });
        });
        should.throws(() => {
            var g = new Grammar({
                root: OPT([a,b]),
            });
            console.log(`dbg g`, JSON.stringify(g));
        });
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
