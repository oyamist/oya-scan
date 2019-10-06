(function(exports) {
    const { 
        logger,
        js,
    } = require('just-simple').JustSimple;
    const Parser = require('./parser');
    const Grammar = require('./grammar');
    const GrammarFactory = require('./grammar-factory');
    const Observation = require('./observation');

    const addop = 'AO';
    const addop_term = 'AT';
    const digit = 'D';
    const divide = '"/"';
    const enter = 'enter';
    const expr = 'E';
    const factor = 'F';
    const lpar = '"("'; 
    const minus = '"-"'; 
    const mulop = 'MO';
    const mulop_factor = 'MF';
    const multiply = '"*"';
    const paren_expr = 'PE';
    const number = 'N';
    const plus = '"+"'; 
    const root = 'root';
    const rpar = '")"'; 
    const signed_number = 'SN';
    const term = 'T';

    const grammarOpts = {
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
        mulop_factor,
        multiply,
        number,
        paren_expr,
        plus,
        rpar,
        signed_number,
        term,

    };

    const gf = new GrammarFactory(grammarOpts);

    class Calculator extends Parser {
        constructor(opts) {
            super(Calculator.options(opts));
            this.answer = new Observation(number, 0);
            this.reduceMap = {};
            console.log(`dbg calc keys:`, Object.keys(this));
            Object.keys(grammarOpts).forEach(k => {
                var fname = `reduce_${k}`;
                var freduce = this[fname];
                var gok = grammarOpts[k];
                if (typeof freduce === 'function') {
                    this.reduceMap[gok] = freduce;
                }
            });

        }

        static options(options={}) {
            var opts = Object.assign({}, options);

            opts.grammar = opts.grammar || gf.create();

            return opts;
        }

        reduce_term(lhs, rhsData) {
            var d0 = rhsData[0];
            var d1 = rhsData[1];
            var v0 = this.numberOf(d0.value);
            if (d1 instanceof Array) {
                for (var i = 0; i < d1.length; i++) {
                    var d1i = d1[i];
                    var tag = d1i.tag;
                    if (tag === multiply) {
                        v0 *= this.numberOf(d1i.value);
                    } else if (tag === divide) {
                        v0 /= this.numberOf(d1i.value);
                    } else {
                        throw new Error(
                            `Invalid rhsData[1]:${JSON.stringify(d1i)}`);
                    }
                }
            }
            return new Observation(number, v0);
        }

        reduce_paren_expr(lhs, rhsData) {
            return rhsData[1];
        }


        numberOf(v) {
            return Number(v.tag === number ? v.value : v);
        }

        reduce_expr(lhs, rhsData) {
            var d0 = rhsData[0];
            var d1 = rhsData[1];
            var v0 = this.numberOf(d0.value);
            if (d1 instanceof Array) {
                for (var i = 0; i < d1.length; i++) {
                    var d1i = d1[i];
                    if (d1i.tag === plus) {
                        v0 += this.numberOf(d1i.value);
                    } else if (d1i.tag === minus) {
                        v0 -= this.numberOf(d1i.value);
                    } else {
                        throw new Error(
                            `Invalid rhsData[1]:${JSON.stringify(d1i)}`);
                    }
                }
            }
            return new Observation(number, v0);
        }

        reduce_addop_term(lhs, rhsData) {
            var d0 = rhsData[0];
            var d1 = rhsData[1];
            return new Observation(d0.tag, d1);
        }

        reduce_mulop_factor(lhs, rhsData) {
            var d0 = rhsData[0];
            var d1 = rhsData[1];
            var ob = new Observation(d0.tag, d1);
            return ob;
        }

        reduce_signed_number(lhs, rhsData) {
            return rhsData[0].length 
                ? new Observation(number, -rhsData[1].value)
                : rhsData[1];
        }

        reduce_number(lhs, rhsData) {
            rhsData = rhsData.reduce((a,v) => a.concat(v),[]); // flat(1)
            var digits = rhsData.reduce( 
                (acc,ob) => `${acc}${ob.value}`, 
                '0');
            return new Observation(number, Number(digits));
        }

        onReduce(tos) {
            var {
                lhs,
                rhsData,
            } = tos;
            var result = super.onReduce(tos);
            var freduce = this.reduceMap[lhs];
            if (freduce) {
                result = freduce.call(this, lhs, rhsData);
            } else {
                if (lhs === root) {
                    this.answer = rhsData[0];
                }
            }
            return result;
        }
    }

    module.exports = exports.Calculator = Calculator;
})(typeof exports === "object" ? exports : (exports = {}));
