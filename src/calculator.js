(function(exports) {
    const { 
        logger,
        js,
    } = require('just-simple').JustSimple;
    const Parser = require('./parser');
    const Grammar = require('./grammar');
    const GrammarFactory = require('./grammar-factory');
    const Observation = require('./observation');

    // root ::= E "="
    // E ::= T STAR( AT )
    // T ::= F STAR( MF )
    // AT ::= AO T
    // AO ::= ALT( "+" | "-" )
    // F ::= ALT( PE | SN )
    // PE ::= "(" E ")"
    // DF ::= "." PLUS( D )
    // MF ::= MO F
    // MO ::= ALT( "*" | "/" )
    // SN ::= OPT( "-" ) N
    // N ::= D STAR( D ) OPT( DF )

    class Calculator extends Parser {
        constructor(opts) {
            super((opts = Calculator.options(opts)));
            this.reduceMap = {};
            var gf = this.grammarFactory = opts.grammarFactory;
            //this.answer = new Observation(gf.number, 0);
            Object.keys(gf).forEach(k => {
                var fname = `reduce_${k}`;
                var freduce = this[fname];
                var gok = gf[k];
                if (typeof freduce === 'function') {
                    this.reduceMap[gok] = freduce;
                }
            });

        }

        static options(options={}) {
            var opts = Object.assign({
                grammarFactory: new GrammarFactory({
                    enter: options.enter || 'enter',
                }),
            }, options);

            opts.grammar = opts.grammar || opts.grammarFactory.create();

            return opts;
        }

        clearAll() {
            super.clearAll();
            this.display = {
                text: '0',
            };
        }

        reduce_term(lhs, rhsData) {
            var {
                multiply,
                divide,
                number,
            } = this.grammarFactory;
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
            var {
                number,
            } = this.grammarFactory;
            return Number(v.tag === number ? v.value : v);
        }

        reduce_expr(lhs, rhsData) {
            var {
                plus,
                minus,
                number,
            } = this.grammarFactory;
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
            var {
                number,
            } = this.grammarFactory;
            return rhsData[0].length 
                ? new Observation(number, -rhsData[1].value)
                : rhsData[1];
        }

        reduce_addop(lhs, rhsData, result) {
            var s0 = this.stack[0];
            var s1 = this.stack[1];
            var {
                expr,
                plus,
                minus,
            } = this.grammarFactory;
            if (s1.lhs === expr && s1.rhsData[1].length) {
                // Evaluate successive addops
                var v0 = this.numberOf(s1.rhsData[0].value);
                var s1d1 = s1.rhsData[1][0];
                var v1 = this.numberOf(s1d1.value);
                if (s1d1.tag === plus) {
                    s1.rhsData[0].value += v1;
                    s1.rhsData[1].shift();
                    this.display.text = s1.rhsData[0].value;
                } else if (s1d1.tag === minus) {
                    s1.rhsData[0].value -= v1;
                    s1.rhsData[1].shift();
                    this.display.text = s1.rhsData[0].value;
                }
            }
            return result;
        }

        reduce_mulop(lhs, rhsData, result) {
            var s0 = this.stack[0];
            var s1 = this.stack[1];
            var {
                term,
                multiply,
                divide,
            } = this.grammarFactory;
            if (s1.lhs === term && s1.rhsData[1].length) {
                // Evaluate succesive mulops
                var v0 = this.numberOf(s1.rhsData[0].value);
                var s1d1 = s1.rhsData[1][0];
                var v1 = this.numberOf(s1d1.value);
                if (s1d1.tag === multiply) {
                    s1.rhsData[0].value *= v1;
                    s1.rhsData[1].shift();
                    this.display.text = s1.rhsData[0].value;
                } else if (s1d1.tag === divide) {
                    s1.rhsData[0].value /= v1;
                    s1.rhsData[1].shift();
                    this.display.text = s1.rhsData[0].value;
                }
            }

            return result;
        }

        reduce_number(lhs, rhsData) {
            var {
                number,
            } = this.grammarFactory;
            var d0 = rhsData[0];
            var d1 = rhsData[1];
            var d2 = rhsData[2];
            var decimal = d2.length
                ? d2[1].reduce((a,d) => ((a+=d.value),a), '.')
                : ''; 
            var digits = d1.reduce((a,ob) => ((a+=ob.value),a), 
                `${d0.value}`); 
            return new Observation(number, Number(digits+decimal));
        }

        onShift(ob) {
            super.onShift(ob);
            var {
                display,
                grammar,
                grammarFactory,
            } = this;
            if (ob.tag === grammarFactory.digit) {
                var text = display.text + ob.value;
                display.text = display.op
                    ? ob.value
                    : text.replace(/^0*/,'');
                delete display.op;
            } else {
                display.op = ob.value;
            }
        }

        onReduce(tos) {
            var {
                lhs,
                rhsData,
            } = tos;
            var result = super.onReduce(tos);
            var freduce = this.reduceMap[lhs];
            if (freduce) {
                result = freduce.call(this, lhs, rhsData, result);
            }
            if (lhs === 'root') {
                this.display.text = rhsData[0].value;
                delete this.display.op;
            }
            return result;
        }
    }

    module.exports = exports.Calculator = Calculator;
})(typeof exports === "object" ? exports : (exports = {}));
