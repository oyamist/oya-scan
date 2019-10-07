(function(exports) {
    const { logger } = require('just-simple').JustSimple;
    const Grammar = require('./grammar');

    // Grammar helpers
    const {
        STAR,
        PLUS,
        OPT,
        ALT,
    } = Grammar;

    class GrammarFactory {
        constructor(opts={}) {
            this.template = opts.template || {};

            // Define terminals for input Observation tags.
            this.digit = opts.digit || 'digit';
            this.id = opts.id || 'id';
            this.period = opts.period || '.';
            this.minus = opts.minus || '-';
            this.plus = opts.plus || '+';
            this.multiply = opts.multiply || '*';
            this.divide = opts.divide || '/';
            this.lpar = opts.lpar || '(';
            this.rpar = opts.rpar || ')';

            // The "enter" terminal can be used to force a reduce
            opts.enter && (this.enter = opts.enter); 

            // rename nonterminals for use in messages
            this.number = opts.number || 'number';
            this.signed_number = opts.signed_number || 'signed_number';
            this.term = opts.term || 'term';
            this.factor = opts.factor || 'factor';
            this.addop_term = opts.addop_term || 'addop_term';
            this.mulop_factor = opts.mulop_factor || 'mulop_factor';
            this.paren_expr = opts.paren_expr || 'paren_expr';
            this.expr = opts.expr || 'expr';
            this.mulop = opts.mulop || 'mulop';
            this.addop = opts.addop || 'addop';
            this.decimal = opts.decimal || 'decimal';
        }

        add_number(number = this.number) {
            var {
                digit,
                decimal,
            } = this;
            var t = this.template;

            t[number] = [ digit, STAR(digit), OPT(decimal) ];
            t[decimal] || this.add_decimal();

            return number;
        }

        add_decimal(decimal = this.decimal) {
            var {
                digit,
                period,
            } = this;
            var t = this.template;

            t[decimal] = [ period, PLUS(digit) ];

            return decimal;
        }

        add_signed_number(signed_number=this.signed_number) {
            var {
                number,
                minus,
            } = this;
            var t = this.template;

            t[signed_number] = [ OPT(minus), number ];
            t[number] || this.add_number();
            return signed_number;
        }

        add_factor(factor=this.factor) {
            var {
                signed_number,
                paren_expr,
            } = this;
            var t = this.template;

            t[factor] = [ ALT(paren_expr, signed_number) ];
            t[paren_expr] || this.add_paren_expr();
            t[signed_number] || this.add_signed_number();
            return factor;
        }

        add_addop_term(addop_term=this.addop_term) {
            var {
                addop,
                term,
            } = this;
            var t = this.template;

            t[addop_term] = [ addop, term];
            t[addop] || this.add_addop();
            t[term] || this.add_term();
            return addop_term;
        }

        add_mulop_factor(mulop_factor=this.mulop_factor) {
            var {
                mulop,
                factor,
            } = this;
            var t = this.template;

            t[mulop_factor] = [ mulop, factor ];
            t[mulop] || this.add_mulop();
            t[factor] || this.add_factor();
            return mulop_factor;
        }

        add_mulop(mulop=this.mulop) {
            var {
                multiply,
                divide,
            } = this;
            var t = this.template;

            t[mulop] = [ ALT(multiply, divide) ];

            return mulop;
        }

        add_term(term=this.term) {
            var {
                factor,
                mulop_factor,
            } = this;
            var t = this.template;

            t[term] = [ factor, STAR(mulop_factor) ];
            t[factor] || this.add_factor();
            t[mulop_factor] || this.add_mulop_factor();
            return term;
        }

        add_paren_expr(paren_expr=this.paren_expr) {
            var {
                expr,
                lpar,
                rpar,
            } = this;
            var t = this.template;

            t[paren_expr] = [ lpar, expr, rpar ];
            t[expr] || this.add_expr();
            return paren_expr;
        }

        add_addop(addop=this.addop) {
            var {
                plus,
                minus,
            } = this;
            var t = this.template;

            t[addop] = [ ALT(plus, minus) ];

            return addop;
        }

        add_expr(expr=this.expr) {
            var {
                addop_term,
                term,
            } = this;
            var t = this.template;

            t[expr] = [ term, STAR(addop_term) ];
            t[addop_term] || this.add_addop_term();
            t[term] || this.add_term();
            return expr;
        }


        create(ntRoot=this.expr, enter=this.enter) {
            var t = this.template;
            t.root = [ ntRoot ];
            enter && t.root.push(enter);
            return new Grammar(t);
        }

    }

    module.exports = exports.GrammarFactory = GrammarFactory;
})(typeof exports === "object" ? exports : (exports = {}));

