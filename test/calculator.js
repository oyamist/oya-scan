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

    const digit = 'D';
    const divide = '/';
    const enter = 'enter';
    const expr = 'E';
    const factor = 'F';
    const addop_term = 'AT';
    const lpar = '"("'; 
    const minus = '"-"'; 
    const multiply = '*';
    const number = 'N';
    const plus = '"+"'; 
    const root = 'root';
    const rpar = '")"'; 
    const mulop = 'mulop';
    const mulop_factor = 'MF';
    const signed_number = 'SN';
    const term = 'T';

    const grammarOpts = {
        addop_term,
        digit,
        divide,
        enter,
        expr,
        factor,
        lpar, 
        minus,
        mulop,
        multiply,
        number,
        plus,
        rpar,
        mulop_factor,
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
                if (typeof freduce === 'function') {
                    this.reduceMap[grammarOpts[k]] = freduce;
                }
            });

        }

        static options(options={}) {
            var opts = Object.assign({}, options);

            opts.grammar = opts.grammar || gf.create();

            return opts;
        }

        reduce_factor(lhs, rhsData) {
            return rhsData[0];
        }

        reduce_mulop(lhs, rhsData) {
            console.log(`dbg mulop`, rhsData[0]);
            return rhsData[0];
        }

        reduce_mulop_factor(lhs, rhsData) {
            var d0 = rhsData[0];
            var d1 = rhsData[1];
            return new Observation(d0.value, d1.value);
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
            var freduce = this.reduceMap[lhs];
            if (freduce) {
                tos.rhsData = freduce(lhs, rhsData);
            } else if (lhs === root) {
                this.answer = rhsData[0];
            }
            super.onReduce(tos);
        }
    }

    function testCalc(calc, input, expected) {
        var obs = input.split('').map(c => {
            var tag = TERMINALS[c] || 'unknown';
            return new Observation(tag, c);
        });
        var logLevel = calc.logLevel;
        if (logLevel) {
            logger[logLevel](
                `testCalc expect: "${input}" => "${expected}"\n`+
                ``);
        }
        calc.clearAll();
        obs.forEach(ob => {
            should(calc.observe(ob)).equal(true);
        });
        if (calc.answer !== expected) {
            logLevel && logger[logLevel] (
                `testCalc grammar\n${calc.grammar}`);
        }
        should(`${calc.answer}`).equal(expected);
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
            logLevel,
        });
        testCalc(calc, '*-123=', `*:-123`);
        testCalc(calc, '*123=', `*:123`);
    });
    it("TESTTESTparses term", ()=> {
        return; // TODO
        var calc = new Calculator({
            grammar: gf.create(gf.add_term()),
            logLevel: 'info',
        });
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
    });
})
