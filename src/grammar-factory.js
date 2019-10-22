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

        add_expr_enter(t=this.template) {
            var {
                expr_enter,
                expr,
                enter,
            } = this;

            t[expr_enter] = [ expr, enter ];
            t[expr] || this.add_expr(t);

            return expr_enter;
        }

        add_unsigned(t=this.template) {
            var {
                digit,
                decimal,
                unsigned,
            } = this;

            t[unsigned] = [ digit, STAR(digit), OPT(decimal) ];
            t[decimal] || this.add_decimal(t);

            return unsigned;
        }

        add_decimal(t=this.template) {
            var {
                digit,
                period,
                decimal,
            } = this;

            t[decimal] = [ period, PLUS(digit) ];

            return decimal;
        }

        add_signed(t=this.template) {
            var {
                unsigned,
                minus,
                signed,
            } = this;

            t[signed] = [ OPT(minus), unsigned ];
            t[unsigned] || this.add_unsigned(t);
            return signed;
        }

        add_factor(t=this.template) {
            var {
                signed,
                paren_expr,
                number,
                expr_enter,
                factor,
            } = this;

            t[factor] = [ ALT(
                paren_expr, 
                signed, 
                number )];
                //number, expr_enter )];
            t[paren_expr] || this.add_paren_expr(t);
            t[signed] || this.add_signed(t);
            //t[expr_enter] || this.add_expr_enter(t);
            return factor;
        }

        add_addop_term(t=this.template) {
            var {
                addop,
                term,
                addop_term,
            } = this;

            t[addop_term] = [ addop, term];
            t[addop] || this.add_addop(t);
            t[term] || this.add_term(t);
            return addop_term;
        }

        add_mulop_factor(t=this.template) {
            var {
                mulop,
                factor,
                mulop_factor,
            } = this;

            t[mulop_factor] = [ mulop, factor ];
            t[mulop] || this.add_mulop(t);
            t[factor] || this.add_factor(t);
            return mulop_factor;
        }

        add_mulop(t=this.template) {
            var {
                multiply,
                divide,
                mulop,
            } = this;

            t[mulop] = [ ALT(multiply, divide) ];

            return mulop;
        }

        add_term(t=this.template) {
            var {
                term,
                factor,
                mulop_factor,
            } = this;

            t[term] = [ factor, STAR(mulop_factor) ];
            t[factor] || this.add_factor(t);
            t[mulop_factor] || this.add_mulop_factor(t);
            return term;
        }

        add_paren_expr(t=this.template) {
            var {
                paren_expr,
                expr,
                lpar,
                rpar,
            } = this;

            t[paren_expr] = [ lpar, expr, rpar ];
            t[expr] || this.add_expr(t);
            return paren_expr;
        }

        add_addop(t=this.template) {
            var {
                addop,
                plus,
                minus,
            } = this;

            t[addop] = [ ALT(plus, minus) ];

            return addop;
        }

        add_entry(t=this.template) {
            var {
                entry,
                enter_expr,
                expr,
            } = this;

            t[entry] = [ expr, STAR(enter_expr) ];
            t[enter_expr] || this.add_enter_expr(t);
            t[expr] || this.add_expr(t);
            return entry;
        }

        add_enter_expr(t=this.template) {
            var {
                enter_expr,
                enter,
                expr,
            } = this;

            t[enter_expr] = [ enter, expr ];
            t[expr] || this.add_expr(t);
            return enter_expr;
        }

        add_expr(t=this.template) {
            var {
                expr,
                addop_term,
                term,
            } = this;

            t[expr] = [ term, STAR(addop_term) ];
            t[addop_term] || this.add_addop_term(t);
            t[term] || this.add_term(t);
            return expr;
        }

        buildGrammar(opts={}) {
            var t = {};
            var ntRoot = opts.addRoot.call(this, t);
            t.root = [ 
                ntRoot, 
                this.eoi, // everything ends: End Of Input
            ];
            return new Grammar(t);
        }

        create(ntRoot=this.expr, t=this.template) { // DEPRECATED
            t.root = [ 
                ntRoot, 
                this.eoi, // everything ends: End Of Input
            ];
            return new Grammar(t);
        }

    }

    module.exports = exports.GrammarFactory = GrammarFactory;
})(typeof exports === "object" ? exports : (exports = {}));

