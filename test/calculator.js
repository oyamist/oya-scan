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

        onReduce(tos) {
            super.onReduce(tos);
            var {
                lhs,
                rhsData,
            } = tos;
            console.log(`${lhs}(${rhsData})`);
            if (lhs === number) {
                rhsData = rhsData.reduce((a,v) => a.concat(v),[]); // flat(1)
                var digits = rhsData.reduce( (acc,ob) => {
                    let value = ob.value;
                    acc = `${acc}${value}`;
                    console.log(`dbg reduce ${acc}`, value, ob);
                    return acc;
                }, '0');
                tos.rhsData = new Observation(number, Number(digits));
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
                `testCalc expect: "${input}" => "${expected}"`
            );
            logger[logLevel](`grammar\n`+
                calc.grammar.toString());
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
        should.deepEqual(g.root, [expr, enter]);
    });
    it("TESTTESTparses number", ()=> {
        gf.add_number();
        var calc = new Calculator({
            grammar: gf.create(gf.add_number()),
            logLevel: 'info',
        });
        testCalc(calc, '123=', 'number:123');
    });
    it("TESTTESTparses signed_number", ()=> {
        return; // TODO dbg
        var calc = new Calculator({
            grammar: gf.create(gf.add_signed_number()),
            logLevel: 'info',
        });
        testCalc(calc, '-123=', 'number:-123');
    });
})
