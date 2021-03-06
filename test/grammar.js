(typeof describe === 'function') && describe("grammar", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const { logger } = require('just-simple').JustSimple;
    const {
        Grammar,
        GrammarFactory,
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
        should.deepEqual(g.rhs('root'), ["expr"]);
        should.deepEqual(g.rhs('addOp'), [ALT("+","-")]);
        should.deepEqual(g.rhs('expr'), [ 
            OPT("addOp"), 
            "term", 
            STAR("expr@2"), // generated
        ]);
        should.deepEqual(g.rhs('expr@2'), // generated
            [ "addOp", "term" ]); 
        should.deepEqual(g.nonterminals.sort(), [
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
        should.deepEqual(g.rhs('root'), [gdef.root]); // canonical
        should.deepEqual(g.rhs('mulop'), gdef.mulop);
        should.deepEqual(g.rhs('term'), [
            OPT("-"),
            "factor",
            STAR("term@2"),
        ]);
        should.deepEqual(g.rhs('term@2'), [ "mulOp", "factor", ]);
        should(JSON.stringify(g.rhs('mulOp')))
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
        should.deepEqual(g.rhs('root'), ["ab"]);
        should.deepEqual(g.rhs('ab'), ['a', STAR('ab@1')]);
        should.deepEqual(g.rhs('ab@1'), ['b', 'c']);
        should.deepEqual(g.nonterminals.sort(), 
            [ "root", "ab", "ab@1", ].sort());
    });
    it("first(sym) => first terminals for sym", ()=>{
        var g = new Grammar({
            root: ALT('cd','bc'),
            aB: ['a', 'B'],
            B: 'b',
            cd: [STAR('c'), 'd'],
            abc: [OPT('a'), OPT('b'), 'c'],
            bc: [PLUS('b'), 'c'],
        });

        should.deepEqual(g.first('a'), {a:true});
        should.deepEqual(g.first('B'), {b:true});
        should.deepEqual(g.first('aB'), {a:true});
        should.deepEqual(g.first('cd'), {c:true, d:true});
        should.deepEqual(g.first('abc'), {a:true, b:true, c:true});
        should.deepEqual(g.first('abc'), {a:true, b:true, c:true});
        should.deepEqual(g.first('bc'), {b:true});
        should.deepEqual(g.first('root'), {b:true,c:true,d:true});
    });
    it("isFirst(sym, lhs) true if sym in first(lhs)", ()=>{
        var g = new Grammar({
            root: ALT('cd','bc'),
            aB: ['a', 'B'],
            B: 'b',
            cd: [STAR('c'), 'd'],
            abc: [OPT('a'), OPT('b'), 'c'],
            bc: [PLUS('b'), 'c'],
        });
        var test = (lhs) => 'abcd'.split('')
            .map(sym => g.isFirst(sym,lhs) ? sym : '-')
            .join('');
        should(test('aB')).equal('a---');
        should(test('B')).equal('-b--');
        should(test('cd')).equal('--cd');
        should(test('abc')).equal('abc-');
        should(test('bc')).equal('-b--');
    });
    it("isLL1() check for valid grammar", ()=> {
        var gf = new GrammarFactory();
        var g = gf.buildGrammar({
            addRoot: gf.add_expr,
        });
    });
})
