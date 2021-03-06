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

    const GO = GrammarFactory.OPTS_DEFAULT();
    var {
        addop_term,
        decimal,
        digit,
        eoi,
        minus,
        signed,
        unsigned,

    } = GO;
    var rhs_signed = [ OPT(minus), unsigned ];
    var rhs_unsigned = [ digit, STAR( digit ), OPT( decimal ) ];

    it("default ctor", ()=>{
        var gf = new GrammarFactory();
        should(gf).instanceOf(GrammarFactory);
        should(gf).properties(GO);
    });
    it("custom ctor", ()=>{
        let addop = 'AO';
        let addop_term = 'AOT';
        let decimal = 'DF';
        let digit = 'D';
        let divide = '|';
        let enter = '=';
        let expr = 'E';
        let factor = 'F';
        let mulop_factor = 'MF';
        let lpar = '[';
        let minus = '!';
        let mulop = 'MD';
        let multiply = 'x';
        let number = 'N';
        let paren_expr = 'PE';
        let period = '.';
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
        var g = gf.buildGrammar({
            addRoot: gf.add_unsigned,
        });
        should.deepEqual(g.rhs('root'), [unsigned, eoi] );
        should.deepEqual(g.rhs(unsigned), rhs_unsigned);
    });
    it("add_signed()", ()=> {
        var gf = new GrammarFactory();
        var g = gf.buildGrammar({
            addRoot: gf.add_signed,
        });
        should.deepEqual(g.rhs('root'), [signed, eoi] );
        should.deepEqual(g.rhs(signed), rhs_signed);
        should.deepEqual(g.rhs(unsigned), rhs_unsigned);
    });
    it("add_paren_expr()", ()=>{
        var gf = new GrammarFactory();
        var {
            paren_expr,
            lpar,
            expr,
            rpar,
        } = GO;

        should(gf.add_paren_expr()).equal(paren_expr);
        should.deepEqual(gf.template.paren_expr, [ lpar, expr, rpar ]);
    });
    it("add_factor()", ()=> {
        var gf = new GrammarFactory();
        var {
            factor,
            minus,
            signed,
            paren_expr,
            unsigned,
            eoi,
            number,
            digit,
            lpar,
            rpar,
            expr,
        } = GO;
        var rhs_factor = [ALT( paren_expr, signed, number )];
        var rhs_signed = [OPT( minus ), unsigned];

        var g = gf.buildGrammar({
            addRoot: gf.add_factor,
        });
        should.deepEqual(g.rhs('root'), [factor, eoi] );
        should.deepEqual(g.rhs(factor), rhs_factor);
        should.deepEqual(g.rhs(signed), rhs_signed);
        should.deepEqual(g.rhs(paren_expr), [ lpar, expr, rpar ]);
    });
    it("add_mulop()", ()=> {
        var gf = new GrammarFactory();
        var {
            mulop,
            eoi,
            multiply,
            divide,
        } = GO;
        var rhs_mulop = [ ALT( multiply, divide ) ];

        var g = gf.buildGrammar({
            addRoot: gf.add_mulop,
        });
        should.deepEqual(g.rhs('root'), [mulop, eoi] );
        should.deepEqual(g.rhs(mulop), rhs_mulop);
    });
    it("add_term()", ()=> {
        var gf = new GrammarFactory();
        var {
            term,
            eoi,
            mulop,
            factor,
            mulop_factor,
        } = GO;
        var rhs_term = [ factor, STAR( mulop_factor ) ];
        var rhs_mulop_factor = [ mulop, factor ];

        var g = gf.buildGrammar({
            addRoot: gf.add_term,
        });
        should.deepEqual(g.rhs('root'), [term, eoi] );
        should.deepEqual(g.rhs(term), rhs_term);
        should.deepEqual(g.rhs(mulop_factor), rhs_mulop_factor);
    });
    it("add_addop()", ()=> {
        var gf = new GrammarFactory();
        var {
            addop,
            plus, 
            minus,
            eoi,
        } = GO;
        var rhs_addop = [ ALT( plus, minus ) ];
        var g = gf.buildGrammar({
            addRoot: gf.add_addop,
        });
        should.deepEqual(g.rhs('root'), [addop, eoi] );
        should.deepEqual(g.rhs(addop), rhs_addop);
    });
    it("add_expr()", ()=> {
        var gf = new GrammarFactory();

        var g = gf.buildGrammar({
            addRoot: gf.add_expr_enter,
        });
        should.deepEqual(g.rhs('root'), 
            [GO.expr_enter, GO.eoi] );
        should.deepEqual(g.rhs(GO.expr), 
            [GO.term, STAR( GO.addop_term )] );
        should.deepEqual(g.rhs(GO.addop_term), 
            [GO.addop, GO.term] );

        // Default grammar is the expression grammar
        var gdefault = gf.buildGrammar();
        should.deepEqual(gdefault, g);
    });
    it("buildGrammar() uses custom nonterminals", ()=> {
        let number = 'N';
        let digit = 'D';
        let root = 'R';
        let unsigned = 'U';
        let decimal = 'DD';

        var gf = new GrammarFactory({
            root,
            unsigned,
            digit,
            decimal,
        });
        var g = gf.buildGrammar({
            addRoot: gf.add_unsigned,
        });
        should.deepEqual(g.rhs('root'), [unsigned, GO.eoi] );
        should.deepEqual(g.rhs(unsigned), [ 
            digit, STAR(digit), OPT(decimal) ]);
    });

})
