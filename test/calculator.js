(typeof describe === 'function') && describe("calculator", function() {
    const winston = require('winston');
    const should = require("should");
    const { logger } = require('just-simple').JustSimple;
    const {
        Parser,
        Grammar,
        GrammarFactory,
        Observation,
    } = require("../index");
    const logLevel = false;

    const digit = 'D';
    const enter = 'enter';
    const expr = 'E';
    const factor = 'F';
    const lpar = '"("'; 
    const minus = '"-"'; 
    const number = 'N';
    const plus = '"+"'; 
    const root = 'root';
    const rpar = '")"'; 
    const signed_factor = 'SF';
    const signed_number = 'SN';
    const term = 'T';
    const grammarOpts = {
        digit,
        enter,
        expr,
        factor,
        lpar, 
        minus,
        number,
        plus,
        rpar,
        signed_factor,
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

        reduce_signed_factor(lhs, rhsData) {
            return rhsData[0].length 
                ? new Observation(number, -rhsData[1].value)
                : rhsData[1];
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
    it("parses signed_factor", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_signed_factor()),
            logLevel,
        });
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
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
