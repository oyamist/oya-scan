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
            this.terse = opts.terse === true;

            var dfltOpts = GrammarFactory.OPTS_DEFAULT(this.terse);
            Object.keys(dfltOpts).forEach(k => {
                this[k] = opts[k] || dfltOpts[k];
            });
        }

        static OPTS_DEFAULT(terse = false) {
            return {
                addop_term: terse ? 'AT' : "addop_term", 
                addop: terse ? 'AO' : "addop", 
                allClear: terse ? 'AC' : "all-clear",
                clear: terse ? 'C' : "clear",
                decimal: terse ? 'DF' : "decimal", 
                digit: terse ? 'D' : "digit", 
                divide: '"/"',
                enter: terse ? '"="' : "enter", 
                eoi: terse ? '$' : "eoi", 
                entry: terse ? 'Y' : "entry",
                expr_enter: terse ? 'ER' : "expr_enter", 
                enter_expr: terse ? 'RE' : "enter_expr",
                expr: terse ? 'E' : "expr", 
                factor: terse ? 'F' : "factor", 
                lpar: '"("',
                minus: terse ? '-' : '"-"',
                mulop: terse ? 'MO' : "mulop",
                mulop_factor: terse ? 'MF' : "mulop_factor", 
                mulop: terse ? 'MO' : "mulop", 
                multiply: '"*"',
                number: terse ? 'N' : "number", 
                paren_expr: terse ? 'PE' : "paren_expr", 
                period: '"."',
                plus: '"+"',
                root: terse ? 'root' : "root", 
                rpar: '")"',
                signed: terse ? 'S' : "signed", 
                term: terse ? 'T' : "term", 
                unsigned: terse ? 'U' : "unsigned", 

            };
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
                expr_enter,
            } = this;
            var t = this.template;

            t[factor] = [ ALT(
                paren_expr, 
                signed, 
                number )];
                //number, expr_enter )];
            t[paren_expr] || this.add_paren_expr();
            t[signed] || this.add_signed();
            //t[expr_enter] || this.add_expr_enter();
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

