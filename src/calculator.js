(function(exports) {
    const { 
        logger,
        js,
    } = require('just-simple').JustSimple;
    const Parser = require('./parser');
    const Grammar = require('./grammar');
    const GrammarFactory = require('./grammar-factory');
    const LineFilter = require('./line-filter');
    const Observation = require('./observation');

    // root ::= ER 
    // ER ::= E "=" 
    // AO ::= ALT( "+" | "-" )
    // MO ::= ALT( "*" | "/" )
    // AT ::= AO T
    // MF ::= MO F
    // E ::= T STAR( AT )
    // T ::= F STAR( MF )
    // F ::= ALT( PE | SN | N )
    // PE ::= "(" E ")"
    // SN ::= OPT( "-" ) U
    // U ::= D STAR( D ) OPT( DF )
    // DF ::= "." PLUS( D )

    class Calculator extends Parser {
        constructor(opts) {
            super((opts = Calculator.options(opts)));
            this.reduceMap = {};
            this.displayTag = opts.displayTag || 'display';
            var gf = this.grammarFactory = opts.grammarFactory;
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
            var gf = opts.grammarFactory;

            opts.grammar = opts.grammar || gf.buildGrammar({
                type: 'calculator',
            });

            return opts;
        }

        clear() {
            super.clear();
            this.display = {
                text: '0',
            };
            var gf = this.grammarFactory;
            this.deltaOp = undefined; 
            this.deltaNum = undefined;
        }

        setDisplay(...args) {
            if (typeof args[0] === 'string') {
                var opts = {
                    text: args[0],
                };
            } else {
                opts = args[0] || {};
            }
            var {
                display,
            } = this;
            opts.text && (display.text = opts.text);
            opts.op && (display.op = opts.op);
            opts.error == null && delete display.error;
            this.log(`display:${js.simpleString(display)}`);
        }

        onReject(ob) {
            super.onReject(ob);
            this.setDisplay({
                error: `${ob}`,
            });
        }

        reduce_expr_enter(lhs, rhsData, result) {
            var d0 = rhsData[0];
            var d1 = rhsData[1];
            var {
                enter,
            } = this.grammarFactory;
            var obtos = this.observations.pop();
            var { deltaOp, deltaNum, } = this;
            this.clear();
            this.deltaOp = deltaOp;
            this.deltaNum = deltaNum;
            this.delta(d0.value, deltaOp, deltaNum);
            this.setDisplay({op: obtos.value});
            return d0;
        }

        reduce_term(lhs, rhsData) {
            return this.calcImmediate(lhs, rhsData);
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
            var ob = this.calcImmediate(lhs, rhsData);
            this.setDisplay({
                text: `${ob.value}`,
                op: this.grammarFactory.enter,
            });
            return ob;
        }

        calcImmediate(lhs, rhsData) {
            var {
                plus,
                minus,
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
                    var d1iv = d1i.value;
                    var tag = d1i.tag;
                    if (d1i.tag === plus) {
                        v0 += this.numberOf(d1iv);
                    } else if (d1i.tag === minus) {
                        v0 -= this.numberOf(d1iv);
                    } else if (tag === multiply) {
                        v0 *= this.numberOf(d1iv);
                    } else if (tag === divide) {
                        v0 /= this.numberOf(d1iv);
                    } else {
                        throw new Error(
                            `Invalid rhsData[1]:${JSON.stringify(d1i)}`);
                    }
                }
                if (d1.length) {
                    this.log(`calcImmediate(${d0.value},${d1}) `+
                        `=> ${v0}`);
                    this.setDisplay({text:`${v0}`});
                }
            }
            return new Observation(number, v0);
        }

        reduce_addop_term(lhs, rhsData) {
            var d0 = rhsData[0];
            var d1 = rhsData[1];
            var d2 = rhsData[2];
            return d2 
                ? new Observation(d0.tag, d2 ) //AT ::= AO STAR(DO) T
                : new Observation(d0.tag, d1); //AT ::= AO T
        }

        reduce_mulop_factor(lhs, rhsData) {
            var d0 = rhsData[0];
            var d1 = rhsData[1];
            var d2 = rhsData[2];
            return d2
                ? new Observation(d0.tag, d2 ) //MF ::= MO STAR(DO) F
                : new Observation(d0.tag, d1); //MF ::= MO F
        }

        reduce_signed(lhs, rhsData) {
            var {
                number,
            } = this.grammarFactory;
            return rhsData[0].length 
                ? new Observation(number, -rhsData[1].value)
                : rhsData[1];
        }

        reduce_addop(lhs, rhsData, result) {
            var d0 = rhsData[0];
            var d1 = rhsData[1];
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
                    this.display.text = ''+s1.rhsData[0].value;
                    this.setDisplay(''+s1.rhsData[0].value);
                } else if (s1d1.tag === minus) {
                    s1.rhsData[0].value -= v1;
                    s1.rhsData[1].shift();
                    this.setDisplay(''+s1.rhsData[0].value);
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
                    this.setDisplay(''+s1.rhsData[0].value);
                } else if (s1d1.tag === divide) {
                    s1.rhsData[0].value /= v1;
                    s1.rhsData[1].shift();
                    this.setDisplay(''+s1.rhsData[0].value);
                }
            }

            return result;
        }

        delta(total, deltaOp, deltaNum) {
            var {
                number,
                plus,
                minus,
                multiply,
                divide,
                enter,
            } = this.grammarFactory;
            if (this.deltaOp == null) {
                var result = new Observation(number, total);
                this.observe(result);
                this.deltaNum = total;
                this.deltaOp = deltaOp;
            } else {
                var totalOld = total;
                if (deltaOp === plus) {
                    total += deltaNum;
                } else if (deltaOp === minus) {
                    total -= deltaNum;
                } else if (deltaOp === multiply) {
                    total *= deltaNum;
                } else if (deltaOp === divide) {
                    total /= deltaNum;
                }
                this.log(`delta(${totalOld},${deltaOp},${deltaNum}) `+
                    `=> ${total}`);
                var result = new Observation(number, total);
                this.observe(result);
            }
            this.log(`push ${js.simpleString(result)}`);
            this.transform.push(result);
        }

        reduce_delta_op(lhs, rhsData, result) {
            var s0d0 = this.stack[0].rhsData[0];
            var s1d0 = this.stack[1].rhsData[0];
            var obEnter = this.observations.pop();
            var total = Number(s1d0.value);
            var deltaOp = s0d0.tag;
            var {
                number,
                minus,
                multiply,
                divide,
                enter,
            } = this.grammarFactory;
            this.clear();
            this.delta(total, deltaOp, this.deltaNum);
            this.setDisplay({op: obEnter.value});
            return result;
        }

        reduce_unsigned(lhs, rhsData) {
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
            var {
                number,
                digit,
                period,
            } = grammarFactory;
            if (ob.tag === digit || ob.tag === period) {
                var text = display.text + ob.value;
                this.setDisplay(display.op
                    ? `${ob.value}`
                    : text.replace(/^0*/,'')
                );
                delete display.op;
            } else if (ob.tag === number) {
                this.setDisplay({
                    text: `${ob.value}`,
                });
                delete this.display.op;
            } else {
                this.setDisplay({op: ob.value});
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
                this.display.text = `${rhsData[0].value}`;
                delete this.display.op;
            }
            return result;
        }

        transformLegacy(is, os, opts={}) {
            var consume = (line, os) => {
                var obIn = new Observation(JSON.parse(line));
                var res = this.observe(obIn);
                var jsonOut = JSON.stringify(
                    new Observation(this.displayTag, this.display));
                os.write(jsonOut+'\n');
            };
            var logLevel = opts.logLevel || this.logLevel;
            var lf = new LineFilter({
                logLevel,
                consume,
            });

            return lf.transform(is, os);
        }

    }

    module.exports = exports.Calculator = Calculator;
})(typeof exports === "object" ? exports : (exports = {}));
