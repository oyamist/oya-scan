(typeof describe === 'function') && describe("calculator", function() {
    const winston = require('winston');
    const should = require("should");
    const { logger } = require('rest-bundle');
    const {
        Parser,
        Grammar,
        GrammarFactory,
        Observation,
    } = require("../index");
    const logLevel = false;
    const minus = 'minus';
    const plus = 'plus';
    const enter = 'enter';
    const number = 'number';
    const digit = 'digit';
    const expr = 'expr';
    const root = 'root';
    const gf = new GrammarFactory({
        enter,
        number,
        plus,
        minus,
    });

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
    };

    class Calculator extends Parser {
        constructor(opts) {
            super(Calculator.options(opts));
            this.answer = new Observation('number', 0);
        }

        static options(options={}) {
            var opts = Object.assign({}, options);

            opts.grammar = opts.grammar || gf.create();

            return opts;
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
            super.onReduce(tos);
            var {
                lhs,
                rhsData,
            } = tos;
            var m = `reduce_${lhs}`;
            if (typeof this[m] === 'function') {
                tos.rhsData = this[m](lhs, rhsData);
            } else if (lhs === root) {
                this.answer = rhsData[0];
            }
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
                `${calc.grammar}`
            );
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
        should.deepEqual(g.rhs('root'), [expr, enter]);
    });
    it("parses number", ()=> {
        gf.add_number();
        var calc = new Calculator({
            grammar: gf.create(gf.add_number()),
            logLevel,
        });
        testCalc(calc, '123=', 'number:123');
    });
    it("parses signed_number", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_signed_number()),
            logLevel,
        });
        testCalc(calc, '-123=', 'number:-123');
        testCalc(calc, '123=', 'number:123');
    });
    it("TESTTESTparses factor", ()=> {
        return; //TODO
        var calc = new Calculator({
            grammar: gf.create(gf.add_factor()),
            logLevel: 'info',
        });
        testCalc(calc, '-123=', 'number:-123');
        testCalc(calc, '123=', 'number:123');
    });
})
