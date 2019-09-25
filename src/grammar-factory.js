(function(exports) {
    const {
        logger,
    } = require('rest-bundle');
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
            this.signed_factor = opts.signed_factor || 'signed_factor';
            this.paren_expr = opts.paren_expr || 'paren_expr';
            this.expr = opts.expr || 'expr';
            this.mulop = opts.mulop || 'mulop';
            this.addop = opts.addop || 'addop';
        }

        add_number(number = this.number) {
            var {
                digit,
            } = this;
            var t = this.template;

            t[number] = [ digit, STAR(digit) ];

            return number;
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

        add_signed_factor(signed_factor=this.signed_factor) {
            var {
                minus,
                factor,
            } = this;
            var t = this.template;

            t[signed_factor] = [ OPT(minus), factor ];
            t[factor] || this.add_factor();
            return signed_factor;
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
                mulop,
                signed_factor,
            } = this;
            var t = this.template;

            t[term] = [ signed_factor, STAR(mulop, signed_factor) ];
            t[mulop] || this.add_mulop();
            t[signed_factor] || this.add_signed_factor();
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
                addop,
                term,
            } = this;
            var t = this.template;

            t[expr] = [ term, STAR(addop, term) ];
            t[addop] || this.add_addop();
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

