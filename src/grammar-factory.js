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

        static options(terse = false) {
            return {
                addop_term: terse ? 'AT' : "addop_term", 
                addop: terse ? 'AO' : "addop", 
                allClear: terse ? 'AC' : "all-clear",
                clear: terse ? 'C' : "clear",
                decimal: terse ? 'DF' : "decimal", 
                delta_op: terse ? 'DO' : 'delta_op',
                digit: terse ? 'D' : "digit", 
                divide: '"/"',
                enter: terse ? '"="' : "enter", 
                eoi: terse ? '$' : "eoi", 
                expr_enter: terse ? 'ER' : "expr_enter", 
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

        static get OPTS_VERBOSE() {
            return GrammarFactory.options(false);
        }

        static get OPTS_TERSE() {
            return GrammarFactory.options(true);
        }

        static OPTS_DEFAULT(terse = false) {
            return GrammarFactory.options(terse);
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

        add_delta_op(t=this.template) {
            var {
                delta_op,
                enter,
            } = this;

            t[delta_op] = [ enter ];

            return delta_op;
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
                delta_op,
                addop_term,
            } = this;

            t[addop_term] = t[delta_op]
                ? [ addop, STAR(delta_op), term ]
                : [ addop, term];
            t[addop] || this.add_addop(t);
            t[term] || this.add_term(t);
            return addop_term;
        }

        add_mulop_factor(t=this.template) {
            var {
                mulop,
                factor,
                delta_op,
                mulop_factor,
            } = this;

            t[mulop_factor] = t[delta_op]
                ? [ mulop, STAR(delta_op), factor ]
                : [ mulop, factor ];
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
            var {
                template,
                type,
                addRoot,
            } = opts;
            template = template || {};
            if (type === "calculator") {
                this.add_delta_op(template);
            }

            addRoot = addRoot || this.add_expr_enter;
            var ntRoot = addRoot.call(this, template);
            template.root = [ 
                ntRoot, 
                this.eoi, // everything ends: End Of Input
            ];
            return new Grammar(template);
        }

    }

    module.exports = exports.GrammarFactory = GrammarFactory;
})(typeof exports === "object" ? exports : (exports = {}));

