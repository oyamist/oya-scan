(typeof describe === 'function') && describe("calculator", function() {
    const winston = require('winston');
    const should = require("should");
    const { 
        logger,
        js,
    } = require('just-simple').JustSimple;
    const {
        Parser,
        Grammar,
        GrammarFactory,
        Observation,
    } = require("../index");
    const logLevel = false;

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

    const TERMINALS = {
        '0': digit,
        '1': digit,
        '2': digit,
        '3': digit,
        '4': digit,
        '5': digit,
        '6': digit,
        '7': digit,
        '8': digit,
        '9': digit,
        '*': multiply,
        '/': divide,
        '-': minus,
        '+': plus,
        '=': enter,
        '(': lpar,
        ')': rpar,
    };

    class Calculator extends Parser {
        constructor(opts) {
            super(Calculator.options(opts));
            this.answer = new Observation(number, 0);
            this.reduceMap = {};
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
            console.log(`dbg term ${js.simpleString(d0)} ${js.simpleString(d1)}`);
            var v0 = Number(d0.value);
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

        reduce_factor(lhs, rhsData) {
            return rhsData[0];
        }

        reduce_addop(lhs, rhsData) {
            return rhsData[0];
        }

        reduce_mulop(lhs, rhsData) {
            return rhsData[0];
        }

        numberOf(v) {
            return Number(v.tag === number ? v.value : v);
        }

        reduce_expr(lhs, rhsData) {
            var d0 = rhsData[0];
            var d1 = rhsData[1];
            var v0 = Number(d0.value);
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
            console.log(`dbg onReduce => ${result}`);
            return result;
        }
    }

    var testAssert = true;

    function testCalc(calc, input, expected) {
        expected = `${expected},enter:=`;
        var obs = input.split('').map(c => {
            var tag = TERMINALS[c] || 'unknown';
            return new Observation(tag, c);
        });
        var logLevel = calc.logLevel;
        if (logLevel) {
            logger[logLevel](
                `testCalc expect: "${input}" => "${expected}"`);
        }
        calc.clearAll();
        for (var i = 0;  i < obs.length; i++) {
            var ob = obs[i];
            var res = calc.observe(ob);
            if (res) {
                continue;
            }
            if (!testAssert) {
                return false;
            }
            should(res).equal(true);
        }
        if (`${calc.answers[0]}` !== expected) {
            logLevel && logger[logLevel] (
                `testCalc grammar\n${calc.grammar}`);
        }
        if (`${calc.answers[0]}` !== expected) {
            if (!testAssert) {
                return false;
            }
        }

        should(`${calc.answers[0]}`).equal(expected);
        return true;
    }

    it("default ctor", ()=>{
        var calc = new Calculator();
        var g = calc.grammar;

        should(g).instanceOf(Grammar);
        should.deepEqual(g.rhs(root), [expr, enter]);
    });
    it("parses number", ()=> {
        gf.add_number();
        var calc = new Calculator({
            grammar: gf.create(gf.add_number()),
            logLevel,
        });
        testCalc(calc, '123=', `${number}:123`);
    });
    it("parses signed_number", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_signed_number()),
            logLevel,
        });
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
    });
    it("parses factor", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_factor()),
            logLevel,
        });
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
    });
    it("parses mulop_factor", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_mulop_factor()),
            logLevel:'info',
        });
        testCalc(calc, '*-123=', `"*":N:-123`);
        testCalc(calc, '*123=', `"*":N:123`);
    });
    it("parses term", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_term()),
            logLevel,
        });
        testCalc(calc, '1*2*3=', `${number}:6`);
        testCalc(calc, '2*3=', `${number}:6`);
        testCalc(calc, '-12*3=', `${number}:-36`);
        testCalc(calc, '12*-3=', `${number}:-36`);
        testCalc(calc, '12/-3=', `${number}:-4`);
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
    });
    it("TESTTESTparses expr", ()=> {
        this.timeout(5*1000);
        var calc = new Calculator({
            grammar: gf.create(gf.add_expr()),
            logLevel: 'info',
        });
        testCalc(calc, '(1+1+3)*(2-3)=', `${number}:-5`);
        testCalc(calc, '5*(2-3)=', `${number}:-5`);
        testCalc(calc, '2+3=', `${number}:5`);
        testCalc(calc, '2-3=', `${number}:-1`);
        testCalc(calc, '-2*3=', `${number}:-6`);
        testCalc(calc, '12*-3=', `${number}:-36`);
        testCalc(calc, '12/-3=', `${number}:-4`);
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
    });
})
