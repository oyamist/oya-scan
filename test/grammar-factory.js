(typeof describe === 'function') && describe("grammar-factory", function() {
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

    const digit = 'digit';
    const decimal = 'decimal';
    const number = 'number';
    const unsigned = 'unsigned';
    const period = '.';
    const signed = 'signed';
    const factor = 'factor';
    const term = 'term';
    const term1 = 'term@1';
    const addop_term = 'addop_term';
    const signed_factor = 'signed_factor';
    const mulop_factor = 'mulop_factor';
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
    const eoi = 'eoi';
    const multiply = '*';
    const divide = '/';
    const paren_expr = 'paren_expr';
    const rhs_unsigned = [ digit, STAR(digit), OPT(decimal) ];
    const rhs_signed = [ OPT(minus), unsigned ];
    const rhs_factor = [ ALT(paren_expr, signed, number) ];
    //const rhs_signed_factor = [ OPT(minus), factor ];
    const rhs_paren_expr = [ lpar, expr, rpar ];
    const rhs_mulop = [ ALT(multiply, divide) ];
    const rhs_addop = [ ALT(plus, minus) ];
    const rhs_term = [ factor, STAR(mulop_factor) ];
    const rhs_mulop_factor = [ mulop, factor ];
    const rhs_expr = [ term, STAR(addop_term) ];
    const rhs_addop_term = [ addop, term ];

    it("default ctor", ()=>{
        var gf = new GrammarFactory();
        should(gf).instanceOf(GrammarFactory);
        should(gf).properties({
            template: {},
            addop_term,
            decimal,
            digit,
            divide,
            expr,
            factor,
            id,
            lpar,
            minus,
            mulop,
            mulop_factor,
            multiply,
            number,
            unsigned,
            paren_expr,
            period,
            plus,
            rpar,
            signed,
            term,

        });
    });
    it("custom ctor", ()=>{
        let addOp = 'AO';
        let decimal = 'DF';
        let digit = 'D';
        let divide = '|';
        let enter = '=';
        let expr = 'E';
        let factor = 'F';
        let mulop_factor = 'MF';
        let id = 'ID';
        let lpar = '[';
        let minus = '!';
        let mulop = 'MD';
        let multiply = 'x';
        let number = 'N';
        let paren_expr = 'PE';
        let period = ',';
        let plus = '#';
        let root = 'ROOT';
        let rpar = ']';
        let signed = 'S';
        let unsigned = 'U';
        let term = 'T';

        var gf = new GrammarFactory({
            addop,
            addop_term,
            decimal,
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
            mulop_factor,
            number,
            paren_expr,
            period,
            plus,
            rpar,
            signed,
            unsigned,
            term,

        });
        should(gf).instanceOf(GrammarFactory);
        should(gf).properties({
            template: {},
            addop,
            addop_term,
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
            mulop_factor,
            number,
            paren_expr,
            plus,
            rpar,
            signed,
            term,
            unsigned,

        });
    });

    it("add_unsigned() one or more digits", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_unsigned()).equal(unsigned);
        should.deepEqual(gf.template.unsigned, rhs_unsigned);

        var g = gf.create(unsigned);
        should.deepEqual(g.rhs('root'), [unsigned, eoi] );
        should.deepEqual(g.rhs(unsigned), rhs_unsigned);
    });
    it("add_signed()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_signed()).equal(signed);
        should.deepEqual(gf.template.signed, rhs_signed);

        var g = gf.create(signed);
        should.deepEqual(g.rhs('root'), [signed, eoi] );
        should.deepEqual(g.rhs(signed), rhs_signed);
        should.deepEqual(g.rhs(unsigned), rhs_unsigned);
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
        should.deepEqual(g.rhs('root'), [factor, eoi] );
        should.deepEqual(g.rhs(factor), rhs_factor);
        should.deepEqual(g.rhs(signed), rhs_signed);
        should.deepEqual(g.rhs(paren_expr), rhs_paren_expr);
        should.deepEqual(g.rhs(unsigned), rhs_unsigned);
    });
    it("add_signed_factor()", ()=> {
        return; // LATER
        var gf = new GrammarFactory();

        should(gf.add_signed_factor()).equal(signed_factor);
        should.deepEqual(gf.template.signed_factor, rhs_signed_factor);

        var g = gf.create(signed_factor);
        should.deepEqual(g.rhs('root'), [signed_factor] );
        should.deepEqual(g.rhs(signed_factor), rhs_signed_factor);
        should.deepEqual(g.rhs(factor), rhs_factor);
        should.deepEqual(g.rhs(signed), rhs_signed);
        should.deepEqual(g.rhs(paren_expr), rhs_paren_expr);
        should.deepEqual(g.rhs(unsigned), rhs_unsigned);
    });
    it("add_mulop()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_mulop()).equal(mulop);
        should.deepEqual(gf.template.mulop, rhs_mulop);

        var g = gf.create(mulop);
        should.deepEqual(g.rhs('root'), [mulop, eoi] );
        should.deepEqual(g.rhs(mulop), rhs_mulop);
    });
    it("add_term()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_term()).equal(term);

        var g = gf.create(term);
        should.deepEqual(g.rhs('root'), [term, eoi] );
        should.deepEqual(g.rhs(term), rhs_term);
        should.deepEqual(g.rhs(mulop_factor), rhs_mulop_factor);
    });
    it("add_addop()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_addop()).equal(addop);
        should.deepEqual(gf.template.addop, rhs_addop);

        var g = gf.create(addop);
        should.deepEqual(g.rhs('root'), [addop, eoi] );
        should.deepEqual(g.rhs(addop), rhs_addop);
    });
    it("add_expr()", ()=> {
        var gf = new GrammarFactory();

        should(gf.add_expr()).equal(expr);

        var g = gf.create(expr);
        should.deepEqual(g.rhs('root'), [expr, eoi] );
        should.deepEqual(g.rhs(expr), rhs_expr);
        should.deepEqual(g.rhs(addop_term), rhs_addop_term);

        // Default grammar is the expression grammar
        var gdefault = gf.create();
        should.deepEqual(gdefault, g);
    });
    it("create() uses custom nonterminals", ()=> {
        let number = 'N';
        let digit = 'D';
        let root = 'R';
        let unsigned = 'U';

        var gf = new GrammarFactory({
            root,
            unsigned,
            digit,
            decimal,
        });
        should(gf.add_unsigned()).equal(unsigned);
        var g = gf.create(unsigned);
        should.deepEqual(g.rhs('root'), [unsigned, eoi] );
        should.deepEqual(g.rhs(unsigned), [ 
            digit, STAR(digit), OPT(decimal) ]);
    });

})
