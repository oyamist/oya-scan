(typeof describe === 'function') && describe("calculator", function() {
    const winston = require('winston');
    const should = require("should");
    const { 
        logger,
        js,
    } = require('just-simple').JustSimple;
    const {
        Calculator,
        Parser,
        Grammar,
        GrammarFactory,
        Observation,
    } = require("../index");
    const logLevel = false;

    // Override default nonterminals with short, mnemonic names
    // that facilitate testing and debuggin.
    const addop = 'AO';
    const addop_term = 'AT';
    const digit = 'D';
    const divide = '"/"';
    const enter = '"="';
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

    const grammarFactory = new GrammarFactory(grammarOpts);

    var testAssert = true;

    function testCalc(calc, input, expected) {
        // Test the given Calculator by converting the
        // input test string into a sequence of Observations that
        // are fed to the Calculator. Each Observation must be
        // successfully parsed and the Calculator must be stateless
        // and ready for input after consuming the last Observation.
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
        expected = `${expected},${enter}:=`;
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

    it("TESTTESTdefault ctor", ()=>{
        var calc = new Calculator();
        should(calc).properties({
            logLevel: 'info',
        });

        // default grammar has long, legible nonterminals
        var g = calc.grammar;
        should(g).instanceOf(Grammar);
        should.deepEqual(g.rhs(root), ['expr', 'enter']);
    });
    it("TESTTESTcustom ctor", ()=>{
        var logStack = 3; // How much of the stack to display for state
        var calc = new Calculator({
            grammarFactory, // custom GrammarFactory with short tokens
            logLevel: 'warn',
            logStack,
        });
        should(calc).properties({
            logLevel: 'warn',
            grammarFactory,
            logStack,
        });

        // custom grammar has short, mnemonic nonterminals
        var g = calc.grammar;
        should(g).instanceOf(Grammar);
        should.deepEqual(g.rhs(root), ['E', '"="']);
    });
    it("parses number", ()=> {
        grammarFactory.add_number();
        var calc = new Calculator({
            grammar: grammarFactory.create(grammarFactory.add_number()),
            grammarFactory,
            logLevel,
        });
        testCalc(calc, '123=', `${number}:123`);
    });
    it("parses signed_number", ()=> {
        var calc = new Calculator({
            grammar: grammarFactory.create(grammarFactory.add_signed_number()),
            grammarFactory,
            logLevel,
        });
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
    });
    it("parses factor", ()=> {
        var calc = new Calculator({
            grammar: grammarFactory.create(grammarFactory.add_factor()),
            grammarFactory,
            logLevel,
        });
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
    });
    it("parses mulop_factor", ()=> {
        var calc = new Calculator({
            grammar: grammarFactory.create(grammarFactory.add_mulop_factor()),
            grammarFactory,
            logLevel,
        });
        testCalc(calc, '*-123=', `"*":N:-123`);
        testCalc(calc, '*123=', `"*":N:123`);
    });
    it("parses term", ()=> {
        var calc = new Calculator({
            grammar: grammarFactory.create(grammarFactory.add_term()),
            grammarFactory,
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
        var calc = new Calculator({
            grammar: grammarFactory.create(grammarFactory.add_expr()),
            grammarFactory,
            logLevel,
        });
        testCalc(calc, '(1+1+3)*(2-3)=', `${number}:-5`);
        testCalc(calc, '(1+1+1+1+1)*(2-3)=', `${number}:-5`);
        testCalc(calc, '5*(2-3)=', `${number}:-5`);
        testCalc(calc, '2+3=', `${number}:5`);
        testCalc(calc, '2-3=', `${number}:-1`);
        testCalc(calc, '-2*3=', `${number}:-6`);
        testCalc(calc, '12*-3=', `${number}:-36`);
        testCalc(calc, '12/-3=', `${number}:-4`);
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
        testCalc(calc, '1+3/20=', `${number}:1.15`);
    });
})
