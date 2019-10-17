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
            this.unsigned = opts.unsigned || 'unsigned';
            this.entry = opts.entry || 'entry';
            this.enter_expr = opts.enter_expr || 'enter_expr';
            this.signed = opts.signed || 'signed';
            this.term = opts.term || 'term';
            this.factor = opts.factor || 'factor';
            this.addop_term = opts.addop_term || 'addop_term';
            this.expr_enter = opts.expr_enter || 'expr_enter';
            this.mulop_factor = opts.mulop_factor || 'mulop_factor';
            this.paren_expr = opts.paren_expr || 'paren_expr';
            this.expr = opts.expr || 'expr';
            this.mulop = opts.mulop || 'mulop';
            this.addop = opts.addop || 'addop';
            this.decimal = opts.decimal || 'decimal';
            this.clear = opts.clear || 'clear';
            this.allClear = opts.allClear || 'all-clear';
            this.eoi = opts.eoi || 'eoi';
        }

        add_expr_enter(expr_enter = this.expr_enter) {
            var {
                expr,
                enter,
            } = this;
            var t = this.template;

            t[expr_enter] = [ expr, enter ];
            t[expr] || this.add_expr();

            return expr_enter;
        }

        add_unsigned(unsigned = this.unsigned) {
            var {
                digit,
                decimal,
            } = this;
            var t = this.template;

            t[unsigned] = [ digit, STAR(digit), OPT(decimal) ];
            t[decimal] || this.add_decimal();

            return unsigned;
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

        add_signed(signed=this.signed) {
            var {
                unsigned,
                minus,
            } = this;
            var t = this.template;

            t[signed] = [ OPT(minus), unsigned ];
            t[unsigned] || this.add_unsigned();
            return signed;
        }

        add_factor(factor=this.factor) {
            var {
                signed,
                paren_expr,
                number,
            } = this;
            var t = this.template;

            t[factor] = [ ALT(paren_expr, signed, number) ];
            t[paren_expr] || this.add_paren_expr();
            t[signed] || this.add_signed();
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

        add_entry(entry=this.entry) {
            var {
                enter_expr,
                expr,
            } = this;
            var t = this.template;

            t[entry] = [ expr, STAR(enter_expr) ];
            t[enter_expr] || this.add_enter_expr();
            t[expr] || this.add_expr();
            return entry;
        }

        add_enter_expr(enter_expr=this.enter_expr) {
            var {
                enter,
                expr,
            } = this;
            var t = this.template;

            t[enter_expr] = [ enter, expr ];
            t[expr] || this.add_expr();
            return enter_expr;
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

        create(ntRoot=this.expr, eoi=this.eoi) {
            var t = this.template;
            t.root = [ 
                ntRoot, 
                eoi, // everything ends: End Of Input
            ];
            return new Grammar(t);
        }

    }

    module.exports = exports.GrammarFactory = GrammarFactory;
})(typeof exports === "object" ? exports : (exports = {}));

