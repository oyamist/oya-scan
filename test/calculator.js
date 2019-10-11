(typeof describe === 'function') && describe("calculator", function() {
    const winston = require('winston');
    const should = require("should");
    const { 
        logger,
        js,
    } = require('just-simple').JustSimple;
    const tmp = require('tmp');
    const fs = require('fs');
    const path = require('path');
    const Stream = require('stream');
    const {
        Calculator,
        Grammar,
        GrammarFactory,
        Observation,
        Parser,

    } = require("../index");
    const logLevel = false;

    // Override default nonterminals with short, mnemonic names
    // that facilitate testing and debugging.
    const addop = 'AO';
    const addop_term = 'AT';
    const decimal = 'DF';
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
    const period = '"."';
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
        decimal,
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
        period,
        plus,
        rpar,
        signed_number,
        term,

    };

    const gf = new GrammarFactory(grammarOpts);

    var testAssert = true;

    function testOb(c) {
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
            '.': period,
            '*': multiply,
            '/': divide,
            '-': minus,
            '+': plus,
            '=': enter,
            '(': lpar,
            ')': rpar,
        };

        var tag = TERMINALS[c] || 'unknown';
        return new Observation(tag, c);
    }

    function testCalc(calc, input, expected) {
        // Test the given Calculator by converting the
        // input test string into a sequence of Observations that
        // are fed to the Calculator. Each Observation must be
        // successfully parsed and the Calculator must be stateless
        // and ready for input after consuming the last Observation.
        expected = `${expected},${enter}:=`;
        var obs = input.split('').map(c => testOb(c));
        var logLevel = calc.logLevel;
        if (logLevel) {
            logger[logLevel](
                `testCalc expect: "${input}" => "${expected}"`);
        }
        calc.clear();
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
        should(calc).properties({
            logLevel: 'info',
        });

        // default grammar has long, legible nonterminals
        var g = calc.grammar;
        should(g).instanceOf(Grammar);
        should.deepEqual(g.rhs(root), ['expr', 'enter']);
    });
    it("custom ctor", ()=>{
        var logStack = 3; // Stack logging depth
        var calc = new Calculator({
            grammarFactory: gf, // custom GrammarFactory with short tokens
            logLevel: 'warn',
            logStack,
        });
        should(calc).properties({
            logLevel: 'warn',
            grammarFactory: gf,
            logStack,
        });

        // custom grammar has short, mnemonic nonterminals
        var g = calc.grammar;
        should(g).instanceOf(Grammar);
        should.deepEqual(g.rhs(root), ['E', '"="']);
    });
    it("parses number", ()=> {
        gf.add_number();
        var calc = new Calculator({
            grammar: gf.create(gf.add_number()),
            grammarFactory: gf,
            logLevel,
        });
        testCalc(calc, '1.23=', `${number}:1.23`);
        testCalc(calc, '12.3=', `${number}:12.3`);
        testCalc(calc, '123=', `${number}:123`);
    });
    it("parses signed_number", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_signed_number()),
            grammarFactory: gf,
            logLevel,
        });
        testCalc(calc, '-123.456=', `${number}:-123.456`);
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
    });
    it("parses factor", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_factor()),
            grammarFactory: gf,
            logLevel,
        });
        testCalc(calc, '-123=', `${number}:-123`);
        testCalc(calc, '123=', `${number}:123`);
    });
    it("parses mulop_factor", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_mulop_factor()),
            grammarFactory: gf,
            logLevel,
        });
        testCalc(calc, '*-123=', `"*":N:-123`);
        testCalc(calc, '*123=', `"*":N:123`);
    });
    it("parses term", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_term()),
            grammarFactory: gf,
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
    it("parses expr", ()=> {
        var calc = new Calculator({
            grammar: gf.create(gf.add_expr()),
            grammarFactory: gf,
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
        testCalc(calc, '1.1+3/20=', `${number}:1.25`);
    });
    it("display shows current state 12+34*5", ()=>{
        var calc = new Calculator({
            grammar: gf.create(gf.add_expr()),
            grammarFactory: gf,
            logLevel,
        });
        should(js.simpleString(calc.display)).equal('{text:0}');
        calc.observe(testOb('1'));
        should(js.simpleString(calc.display)).equal('{text:1}');
        calc.observe(testOb('2'));
        should(js.simpleString(calc.display)).equal('{text:12}');
        calc.observe(testOb('+'));
        should(js.simpleString(calc.display)).equal('{text:12,op:+}');
        calc.observe(testOb('3'));
        should(js.simpleString(calc.display)).equal('{text:3}');
        calc.observe(testOb('4'));
        should(js.simpleString(calc.display)).equal('{text:34}');
        calc.observe(testOb('*'));
        should(js.simpleString(calc.display)).equal('{text:34,op:*}');
        calc.observe(testOb('5'));
        should(js.simpleString(calc.display)).equal('{text:5}');
        calc.observe(testOb('='));
        should(js.simpleString(calc.display)).equal('{text:182}');
    });
    it("display shows running sum 4+3-2+1", ()=>{
        var calc = new Calculator({
            grammar: gf.create(gf.add_expr()),
            grammarFactory: gf,
            logLevel,
        });
        // successive addops
        should(js.simpleString(calc.display)).equal('{text:0}');
        calc.observe(testOb('4'));
        should(js.simpleString(calc.display)).equal('{text:4}');
        calc.observe(testOb('+'));
        should(js.simpleString(calc.display)).equal('{text:4,op:+}');
        calc.observe(testOb('3'));
        should(js.simpleString(calc.display)).equal('{text:3}');
        calc.observe(testOb('-'));
        should(js.simpleString(calc.display)).equal('{text:7,op:-}');
        calc.observe(testOb('2'));
        should(js.simpleString(calc.display)).equal('{text:2}');
        calc.observe(testOb('+'));
        should(js.simpleString(calc.display)).equal('{text:5,op:+}');
        calc.observe(testOb('1'));
        should(js.simpleString(calc.display)).equal('{text:1}');
        calc.observe(testOb('='));
        should(js.simpleString(calc.display)).equal('{text:6}');
    });
    it("display shows running product 5*4*3*2", ()=>{
        var calc = new Calculator({
            grammar: gf.create(gf.add_expr()),
            grammarFactory: gf,
            logLevel,
        });
        // successive addops
        should(js.simpleString(calc.display)).equal('{text:0}');
        calc.observe(testOb('5'));
        should(js.simpleString(calc.display)).equal('{text:5}');
        calc.observe(testOb('*'));
        should(js.simpleString(calc.display)).equal('{text:5,op:*}');
        calc.observe(testOb('4'));
        should(js.simpleString(calc.display)).equal('{text:4}');
        calc.observe(testOb('*'));
        should(js.simpleString(calc.display)).equal('{text:20,op:*}');
        calc.observe(testOb('3'));
        should(js.simpleString(calc.display)).equal('{text:3}');
        calc.observe(testOb('*'));
        should(js.simpleString(calc.display)).equal('{text:60,op:*}');
        calc.observe(testOb('2'));
        should(js.simpleString(calc.display)).equal('{text:2}');
        calc.observe(testOb('='));
        should(js.simpleString(calc.display)).equal('{text:120}');
    });
    it("display shows running division 24/4/3/2", ()=>{
        var calc = new Calculator({
            grammar: gf.create(gf.add_expr()),
            grammarFactory: gf,
            logLevel,
        });
        // successive addops
        should(js.simpleString(calc.display)).equal('{text:0}');
        calc.observe(testOb('2'));
        should(js.simpleString(calc.display)).equal('{text:2}');
        calc.observe(testOb('4'));
        should(js.simpleString(calc.display)).equal('{text:24}');
        calc.observe(testOb('/'));
        should(js.simpleString(calc.display)).equal('{text:24,op:/}');
        calc.observe(testOb('4'));
        should(js.simpleString(calc.display)).equal('{text:4}');
        calc.observe(testOb('/'));
        should(js.simpleString(calc.display)).equal('{text:6,op:/}');
        calc.observe(testOb('3'));
        should(js.simpleString(calc.display)).equal('{text:3}');
        calc.observe(testOb('/'));
        should(js.simpleString(calc.display)).equal('{text:2,op:/}');
        calc.observe(testOb('2'));
        should(js.simpleString(calc.display)).equal('{text:2}');
        calc.observe(testOb('='));
        should(js.simpleString(calc.display)).equal('{text:1}');
    });
    it("TESTTESTtransform(...) implements LineFilter", (done)=>{
        (async function() { try {
            var calc = new Calculator({
                grammar: gf.create(gf.add_expr()),
                grammarFactory: gf,
                logLevel,
            });
            var is = new Stream.Readable();
            var ospath = tmp.tmpNameSync();
            var os = fs.createWriteStream(ospath, {
                emitClose: true,
            });
            var promise = calc.transform(is, os, {
                logLevel,
            });
            var obs = [
                new Observation(gf.digit, 1),
                new Observation(gf.plus, '+'),
                new Observation(gf.digit, 2),
                new Observation(gf.enter, '='),
            ];
            obs.forEach(ob => {
                is.push(JSON.stringify(ob)+'\n');
            });
            os.on('close', () => {
                try { // check output
                    should(fs.existsSync(ospath));
                    var odata = fs.readFileSync(ospath);
                    var olines = odata.toString().split('\n');
                    var i = 0;
                    should(olines[i++]).match(/{"text":"1"}/);
                    should(olines[i++]).match(/{"text":"1","op":"\+"}/);
                    should(olines[i++]).match(/{"text":"2"}/);
                    should(olines[i++]).match(/{"text":"3"}/);
                    fs.unlinkSync(ospath);
                    done();
                } catch (e) {
                    done(e);
                }
            });

            is.push(null);
            var result = await promise;
            os.end();
            should(result).properties(['started', 'ended']);
            should(result).properties({
                bytes: 224,
                observations: 4,
            });
            should(result.started).instanceOf(Date);
            should(result.ended).instanceOf(Date);

        } catch(e) { done(e); }})();
    });
    it("default ctor calculates", ()=>{
        var calc = new Calculator({
            logLevel,
        });
        var gf = calc.grammarFactory;
        var g = calc.grammar;
        //console.log(js.simpleString(g));
        var {
            digit,
            plus,
            enter,
        } = gf;
        var obs = [
            new Observation(digit, '1'),
            new Observation(plus, '+'),
            new Observation(digit, '2'),
            new Observation(plus, '+'),
            new Observation(digit, 3),
            new Observation(enter, 'enter'),
        ];
        var i = 0;
        should(calc.observe(obs[i++])).equal(true); // 1
        should(js.simpleString(calc.display)).equal('{text:1}');
        should(calc.observe(obs[i++])).equal(true); // +
        should(js.simpleString(calc.display)).equal('{text:1,op:+}');
        should(calc.observe(obs[i++])).equal(true); // 2
        should(js.simpleString(calc.display)).equal('{text:2}');
        should(calc.observe(obs[i++])).equal(true); // +
        should(js.simpleString(calc.display)).equal('{text:3,op:+}');
        should(calc.observe(obs[i++])).equal(true); // 3
        should(js.simpleString(calc.display)).equal('{text:3}');
        should(calc.observe(obs[i++])).equal(true); // enter
        should(js.simpleString(calc.display)).equal('{text:6}');
    });
    it("TESTTESTundo() clears last observation", ()=>{
        var calc = new Calculator({
            logLevel,
        });
        var gf = calc.grammarFactory;
        var g = calc.grammar;
        //console.log(js.simpleString(g));
        var {
            digit,
            plus,
            enter,
        } = gf;
        var obs = [
            new Observation(digit, '1'),
            new Observation(plus, '+'),
            new Observation(digit, '2'),
            new Observation(plus, '+'),
            new Observation(digit, 3),
            new Observation(enter, 'enter'),
        ];
        var i = 0;
        should(calc.observe(obs[i++])).equal(true); // 1
        should(js.simpleString(calc.display)).equal('{text:1}');
        should(calc.observe(obs[i++])).equal(true); // +
        should(js.simpleString(calc.display)).equal('{text:1,op:+}');
        should(calc.observe(obs[i++])).equal(true); // 2
        should(js.simpleString(calc.display)).equal('{text:2}');
        should(calc.observe(obs[i++])).equal(true); // +
        should(js.simpleString(calc.display)).equal('{text:3,op:+}');
        should(calc.observe(obs[i++])).equal(true); // 3
        should(js.simpleString(calc.display)).equal('{text:3}');
        should(calc.observe(obs[i++])).equal(true); // enter
        should(js.simpleString(calc.display)).equal('{text:6}');

        // reverse 
        should(calc.undo()).equal(obs[--i]);
        should(js.simpleString(calc.display)).equal('{text:3}');
        should(calc.undo()).equal(obs[--i]);
        should(js.simpleString(calc.display)).equal('{text:3,op:+}');
        should(calc.undo()).equal(obs[--i]);
        should(js.simpleString(calc.display)).equal('{text:2}');
        should(calc.undo()).equal(obs[--i]);
        should(js.simpleString(calc.display)).equal('{text:1,op:+}');
        should(calc.undo()).equal(obs[--i]);
        should(js.simpleString(calc.display)).equal('{text:1}');
        should(calc.undo()).equal(obs[--i]);
        should(js.simpleString(calc.display)).equal('{text:0}');
        should(calc.undo()).equal(null);

    });
})
