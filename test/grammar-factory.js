(typeof describe === 'function') && describe("grammar-factory", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const tmp = require('tmp');
    const { logger } = require('rest-bundle');
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

    const digit = 'digit';
    const number = 'number';
    const signed_number = 'signed_number';
    const factor = 'factor';
    const term = 'term';
    const term1 = 'term@1';
    const signed_factor = 'signed_factor';
    const enter = 'enter';
    const expr = 'expr';
    const expr1 = 'expr@1';
    const mulop = 'mulop';
    const addop = 'addop';
    const id = 'id';
    const lpar = '(';
    const rpar = ')';
    const minus = '-';
    const plus = '+';
    const multiply = '*';
    const divide = '/';
    const paren_expr = 'paren_expr';
    const rhs_number = [ digit, STAR(digit) ];
    const rhs_signed_number = [ OPT(minus), number ];
    const rhs_factor = [ ALT(paren_expr, signed_number) ];
    const rhs_signed_factor = [ OPT(minus), factor ];
    const rhs_paren_expr = [ lpar, expr, rpar ];
    const rhs_mulop = [ ALT(multiply, divide) ];
    const rhs_addop = [ ALT(plus, minus) ];
    const rhs_term = [ signed_factor, STAR(term1) ];
    const rhs_term1 = [ mulop, signed_factor ];
    const rhs_expr = [ term, STAR(expr1) ];
    const rhs_expr1 = [ addop, term ];

    it("TESTTESTdefault ctor", ()=>{
        var gf = new GrammarFactory();
        should(gf).instanceOf(GrammarFactory);
        should(gf).properties({
            template: {},
            digit,
            number,
            signed_number,
            factor,
            signed_factor,
            mulop,
            term,
            expr,
            id,
            lpar,
            rpar,
            paren_expr,
            minus,
            plus,
            multiply,
            divide,
        });
    });
    it("TESTTESTcustom ctor", ()=>{
        let addOp = 'AO';
        let digit = 'D';
        let divide = '|';
        let enter = '=';
        let expr = 'E';
        let factor = 'F';
        let id = 'ID';
        let lpar = '[';
        let minus = '!';
        let mulop = 'MD';
        let multiply = 'x';
        let number = 'N';
        let paren_expr = 'PE';
        let plus = '#';
        let root = 'ROOT';
        let rpar = ']';
        let signed_factor = 'SF';
        let signed_number = 'SN';
        let term = 'T';

        var gf = new GrammarFactory({
            addop,
            digit,
            divide,
            enter,
            expr,
            factor,
            id,
            lpar,
            minus,
            mulop,
            multiply,
            number,
            paren_expr,
            plus,
            rpar,
            signed_factor,
            signed_number,
            term,

        });
        should(gf).instanceOf(GrammarFactory);
        should(gf).properties({
            template: {},
            addop,
            digit,
            divide,
            enter,
            expr,
            factor,
            id,
            lpar,
            minus,
            mulop,
            multiply,
            number,
            paren_expr,
            plus,
            rpar,
            signed_factor,
            signed_number,
            term,

        });
    });

    it("add_number() one or more digits", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_number()).equal(number);
        should.deepEqual(gf.template.number, rhs_number);

        var g = gf.create(number);
        should.deepEqual(g.rhs('root'), [number] );
        should.deepEqual(g.rhs(number), rhs_number);
    });
    it("add_signed_number()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_signed_number()).equal(signed_number);
        should.deepEqual(gf.template.signed_number, rhs_signed_number);

        var g = gf.create(signed_number);
        should.deepEqual(g.rhs('root'), [signed_number] );
        should.deepEqual(g.rhs(signed_number), rhs_signed_number);
        should.deepEqual(g.rhs(number), rhs_number);
    });
    it("add_paren_expr()", ()=>{
        var gf = new GrammarFactory();

        should(gf.add_paren_expr()).equal(paren_expr);
        should.deepEqual(gf.template.paren_expr, rhs_paren_expr);
    });
    it("add_factor()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_factor()).equal(factor);
        should.deepEqual(gf.template.factor, rhs_factor);

        var g = gf.create(factor);
        should.deepEqual(g.rhs('root'), [factor] );
        should.deepEqual(g.rhs(factor), rhs_factor);
        should.deepEqual(g.rhs(signed_number), rhs_signed_number);
        should.deepEqual(g.rhs(paren_expr), rhs_paren_expr);
        should.deepEqual(g.rhs(number), rhs_number);
    });
    it("add_signed_factor()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_signed_factor()).equal(signed_factor);
        should.deepEqual(gf.template.signed_factor, rhs_signed_factor);

        var g = gf.create(signed_factor);
        should.deepEqual(g.rhs('root'), [signed_factor] );
        should.deepEqual(g.rhs(signed_factor), rhs_signed_factor);
        should.deepEqual(g.rhs(factor), rhs_factor);
        should.deepEqual(g.rhs(signed_number), rhs_signed_number);
        should.deepEqual(g.rhs(paren_expr), rhs_paren_expr);
        should.deepEqual(g.rhs(number), rhs_number);
    });
    it("add_mulop()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_mulop()).equal(mulop);
        should.deepEqual(gf.template.mulop, rhs_mulop);

        var g = gf.create(mulop);
        should.deepEqual(g.rhs('root'), [mulop] );
        should.deepEqual(g.rhs(mulop), rhs_mulop);
    });
    it("add_term()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_term()).equal(term);

        var g = gf.create(term);
        should.deepEqual(g.rhs('root'), [term] );
        should.deepEqual(g.rhs(term), rhs_term);
        should.deepEqual(g.rhs(term1), rhs_term1);
    });
    it("add_addop()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_addop()).equal(addop);
        should.deepEqual(gf.template.addop, rhs_addop);

        var g = gf.create(addop);
        should.deepEqual(g.rhs('root'), [addop] );
        should.deepEqual(g.rhs(addop), rhs_addop);
    });
    it("add_expr()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_expr()).equal(expr);

        var g = gf.create(expr);
        should.deepEqual(g.rhs('root'), [expr] );
        should.deepEqual(g.rhs(expr), rhs_expr);
        should.deepEqual(g.rhs(expr1), rhs_expr1);

        // Default grammar is the expression grammar
        var gdefault = gf.create();
        should.deepEqual(gdefault, g);
    });
    it("create() uses custom nonterminals", ()=> {
        let number = 'N';
        let digit = 'D';
        let root = 'R';

        var gf = new GrammarFactory({
            root,
            number,
            digit,
        });
        should(gf.add_number()).equal(number);
        var g = gf.create(number);
        should.deepEqual(g.rhs('root'), [number] );
        should.deepEqual(g.rhs(number), [ digit, STAR(digit) ]);
    });

})
