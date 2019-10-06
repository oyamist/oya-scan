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

    const grammarFactory = new GrammarFactory(grammarOpts);

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

    it("TESTTESTdefault ctor", ()=>{
        var calc = new Calculator();
        var g = calc.grammar;

        should(g).instanceOf(Grammar);
        should.deepEqual(g.rhs(root), ['expr', 'enter']);
    });
    it("TESTTESTcustom ctor", ()=>{
        var calc = new Calculator({
            grammarFactory, // custom GrammarFactory with short tokens
        });
        var g = calc.grammar;

        should(g).instanceOf(Grammar);
        should.deepEqual(g.rhs(root), [expr, 'enter']);
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
    });
})
