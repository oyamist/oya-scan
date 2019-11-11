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
    const {
        Readable,
        Writable,
    } = require('stream');
    const {
        Calculator,
        Grammar,
        GrammarFactory,
        Observation,
        Parser,
        Pipeline,

    } = require("../index");
    const logLevel = false;

    // Override default nonterminals with short, mnemonic names
    // that facilitate testing and debugging.
    const addop = 'AO';
    const addop_term = 'AT';
    const decimal = 'DF';
    const delta_op = 'DO';
    const digit = 'D';
    const divide = '"/"';
    const enter = '"="';
    const eoi = '$';
    const expr = 'E';
    const factor = 'F';
    const lpar = '"("'; 
    const minus = '"-"'; 
    const mulop = 'MO';
    const mulop_factor = 'MF';
    const multiply = '"*"';
    const period = '"."';
    const expr_enter = 'ER';
    const paren_expr = 'PE';
    const number = 'N';
    const plus = '"+"'; 
    const root = 'root';
    const rpar = '")"'; 
    const signed = 'S';
    const term = 'T';
    const unsigned = 'U';

    const grammarOpts = {
        addop,
        addop_term,
        decimal,
        delta_op,
        digit,
        divide,
        enter,
        eoi,
        expr,
        expr_enter,
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
        signed,
        unsigned,
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
            '$': eoi,
            '(': lpar,
            ')': rpar,
        };

        var tag = TERMINALS[c] || 'unknown';
        return new Observation(tag, c);
    }

    class TestCalc extends Calculator {
        constructor(opts={}) {
            super(opts);
        }

        testObs(tag, value, expected) {
            var ob = new Observation(tag, value);
            var res = this.observe(ob);
            should(res).equal(null);
            var ds = js.simpleString(this.display);
            this.log(ds);
            if (ds !== expected) {
                logger.error(`testObs() ${this.state()}`);
            }
            should(ds).equal(expected);
        }
        testChar(c, expected) {
            var ob = testOb(c);
            var res = this.observe(ob);
            should(res).equal(null);
            this.log(`testChar(${c}) `+
                `display:${js.simpleString(this.display)}`);
            var ds = js.simpleString(this.display);
            if (ds !== expected) {
                logger.error(`testChar(${c}) ${this.state()}`);
            }
            should(ds).equal(expected);
        }
    }

    function testCalc(calc, input, expected) {
        // Test the given Calculator by converting the
        // input test string into a sequence of Observations that
        // are fed to the Calculator. Each Observation must be
        // successfully parsed and the Calculator must be stateless
        // and ready for input after consuming the last Observation.
        expected = `${expected},${eoi}:${eoi}`;
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
            should(res).equal(null);
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
        should.deepEqual(g.rhs(root), ['expr_enter', 'eoi']);
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
        should.deepEqual(g.rhs(root), ['ER', '$']);
    });
    it("enter running product", ()=> {
        var tc = new TestCalc({
            grammarFactory: gf,
            logLevel,
        });
        tc.testChar('2', '{text:2}');
        tc.testChar('*', '{text:2,op:*}');
        tc.testChar('3', '{text:3}');
        tc.testChar('=', '{text:6,op:=}'); // TODO
        tc.testChar('*', '{text:6,op:*}');
        tc.testChar('4', '{text:4}');
        tc.testChar('=', '{text:24,op:=}'); // TODO
        tc.testChar('*', '{text:24,op:*}');
        tc.testChar('5', '{text:5}');
        tc.testChar('=', '{text:120,op:=}');
    });
    it("enter 1+2*3", ()=> {
        var tc = new TestCalc({
            grammarFactory: gf,
            logLevel,
        });
        tc.testChar('1', '{text:1}');
        tc.testChar('+', '{text:1,op:+}');
        tc.testChar('2', '{text:2}');
        tc.testChar('=', '{text:3,op:=}');
        tc.testChar('*', '{text:3,op:*}');
        tc.testChar('3', '{text:3}');
        tc.testChar('=', '{text:9,op:=}');
    });
    it("precedence 2*3+4*5", ()=> {
        var tc = new TestCalc({
            grammarFactory: gf,
            logLevel,
        });
        tc.testChar('2', '{text:2}');
        tc.testChar('*', '{text:2,op:*}');
        tc.testChar('3', '{text:3}');
        tc.testChar('+', '{text:6,op:+}');
        tc.testChar('4', '{text:4}');
        tc.testChar('*', '{text:4,op:*}');
        tc.testChar('5', '{text:5}');
        tc.testChar('=', '{text:26,op:=}');
    });
    it("parses signed", ()=> {
        var grammar = gf.buildGrammar({
            addRoot: gf.add_signed,
        });
        var calc = new Calculator({
            grammar,
            grammarFactory: gf,
            logLevel,
        });
        testCalc(calc, '-123.456$', `${number}:-123.456`);
        testCalc(calc, '-123$', `${number}:-123`);
        testCalc(calc, '123$', `${number}:123`);
    });
    it("parses factor", ()=> {
        var grammar = gf.buildGrammar({
            addRoot: gf.add_factor,
        });
        var calc = new Calculator({
            grammar,
            grammarFactory: gf,
            logLevel,
        });
        testCalc(calc, '-123$', `N:-123`);
        testCalc(calc, '123$', `N:123`);
    });
    it("parses mulop_factor", ()=> {
        var grammar = gf.buildGrammar({
            addRoot: gf.add_mulop_factor,
        });
        var calc = new Calculator({
            grammar,
            grammarFactory: gf,
            logLevel,
        });
        testCalc(calc, '*-123$', `"*":N:-123`);
        testCalc(calc, '*123$', `"*":N:123`);
    });
    it("parses term", ()=> {
        var grammar = gf.buildGrammar({
            addRoot: gf.add_term,
        });
        var calc = new Calculator({
            grammar,
            grammarFactory: gf,
            logLevel,
        });
        testCalc(calc, '1*2*3$', `${number}:6`);
        testCalc(calc, '2*3$', `${number}:6`);
        testCalc(calc, '-12*3$', `${number}:-36`);
        testCalc(calc, '12*-3$', `${number}:-36`);
        testCalc(calc, '12/-3$', `${number}:-4`);
        testCalc(calc, '-123$', `${number}:-123`);
        testCalc(calc, '123$', `${number}:123`);
    });
    it("parses expr", ()=> {
        var grammar = gf.buildGrammar({
            addRoot: gf.add_expr,
        });
        var calc = new Calculator({
            grammar,
            grammarFactory: gf,
            logLevel,
        });
        testCalc(calc, '(1+1+3)*(2-3)$', `${number}:-5`);
        testCalc(calc, '(1+1+1+1+1)*(2-3)$', `${number}:-5`);
        testCalc(calc, '5*(2-3)$', `${number}:-5`);
        testCalc(calc, '2+3$', `${number}:5`);
        testCalc(calc, '2-3$', `${number}:-1`);
        testCalc(calc, '-2*3$', `${number}:-6`);
        testCalc(calc, '12*-3$', `${number}:-36`);
        testCalc(calc, '12/-3$', `${number}:-4`);
        testCalc(calc, '-123$', `${number}:-123`);
        testCalc(calc, '123$', `${number}:123`);
        testCalc(calc, '1+3/20$', `${number}:1.15`);
        testCalc(calc, '1.1+3/20$', `${number}:1.25`);
    });
    it("display shows current state 12+34*5", ()=>{
        var grammar = gf.buildGrammar({
            addRoot: gf.add_expr,
        });
        var calc = new Calculator({
            grammar,
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
        calc.observe(testOb(eoi));
        should(js.simpleString(calc.display)).equal('{text:182}');
    });
    it("display shows running sum 4+3-2+1", ()=>{
        var grammar = gf.buildGrammar({
            addRoot: gf.add_expr,
        });
        var calc = new Calculator({
            grammar,
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
        calc.observe(testOb(eoi));
        should(js.simpleString(calc.display)).equal('{text:6}');
    });
    it("display shows running product 5*4*3*2", ()=>{
        var grammar = gf.buildGrammar({
            addRoot: gf.add_expr,
        });
        var calc = new Calculator({
            grammar,
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
        calc.observe(testOb(eoi));
        should(js.simpleString(calc.display)).equal('{text:120}');
    });
    it("display shows running division 24/4/3/2", ()=>{
        var grammar = gf.buildGrammar({
            addRoot: gf.add_expr,
        });
        var calc = new Calculator({
            grammar,
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
        calc.observe(testOb(eoi));
        should(js.simpleString(calc.display)).equal('{text:1}');
    });
    it("transformLegacy(...) implements LineFilter", (done)=>{
        done(); return;
        var handled = false;
        (async function() { try {
            var grammar = gf.buildGrammar({
                addRoot: gf.add_expr,
            });
            var calc = new Calculator({
                grammar,
                grammarFactory: gf,
                logLevel,
            });
            var is = new Readable();
            var ospath = tmp.tmpNameSync();
            var os = fs.createWriteStream(ospath, {
                emitClose: true,
            });
            var promise = calc.transformLegacy(is, os, {
                logLevel,
            });
            var obs = [
                new Observation(gf.digit, 1),
                new Observation(gf.plus, '+'),
                new Observation(gf.digit, 2),

                // End Of Input is explicit
                // and equivalent to "Over and Out".
                new Observation(gf.eoi, eoi), 
            ];
            obs.forEach(ob => {
                is.push(JSON.stringify(ob)+'\n');
            });
            os.on('close', () => {
                if (handled) {
                    return;
                }
                handled = true;
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
                bytes: 220,
                observations: 4,
            });
            should(result.started).instanceOf(Date);
            should(result.ended).instanceOf(Date);

        } catch(e) { 
            handled = true;
            done(e); 
        }})();
    });
    it("TESTTESTobserve(ob) calculates", ()=>{
        var calc = new Calculator({ logLevel, grammarFactory: gf});

        // The observe() method can be called directly to verify
        // calculator internal state for testing without streams.
        should(calc.observe(new Observation(gf.digit, '1'))).equal(null);
        should(js.simpleString(calc.display)).equal('{text:1}');
        should(calc.observe(new Observation(gf.plus, '+'))).equal(null);
        should(js.simpleString(calc.display)).equal('{text:1,op:+}');
        should(calc.observe(new Observation(gf.digit, '2'))).equal(null);
        should(js.simpleString(calc.display)).equal('{text:2}');
        should(calc.observe(new Observation(gf.enter, '='))).equal(null);
        should(js.simpleString(calc.display)).equal('{text:3,op:=}');
    });
    it("undo() clears last observation", ()=>{
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
            new Observation(enter, '='),
        ];
        var i = 0;
        should(calc.observe(obs[i++])).equal(null); // 1
        should(js.simpleString(calc.display)).equal('{text:1}');
        should(calc.observe(obs[i++])).equal(null); // +
        should(js.simpleString(calc.display)).equal('{text:1,op:+}');
        should(calc.observe(obs[i++])).equal(null); // 2
        should(js.simpleString(calc.display)).equal('{text:2}');
        should(calc.observe(obs[i++])).equal(null); // +
        should(js.simpleString(calc.display)).equal('{text:3,op:+}');
        should(calc.observe(obs[i++])).equal(null); // 3
        should(js.simpleString(calc.display)).equal('{text:3}');

        // reverse 
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
    it("observe() accepts number", ()=>{
        var tc = new TestCalc({
            grammarFactory: gf,
            grammar: gf.buildGrammar(),
            logLevel,
        });
        tc.observe(new Observation(number, 1));
        should(js.simpleString(tc.display)).equal(`{text:1}`);
        tc.testChar('+', '{text:1,op:+}');
        tc.testChar('2', '{text:2}');
        tc.testChar('+', '{text:3,op:+}');
        tc.observe(new Observation(number, 42));
        should(js.simpleString(tc.display)).equal(`{text:42}`);
        tc.testChar('=', '{text:45,op:=}');
    });
    it("enter collapses state", ()=>{
        var tc = new TestCalc({
            grammarFactory: gf,
            grammar: gf.buildGrammar(),
            logLevel,
        });
        var {
            number,
            enter,
       } = tc.grammarFactory;

        // Observation of "enter" collapses state
        tc.testChar('1', '{text:1}');
        tc.testChar('+', '{text:1,op:+}');
        tc.testChar('2', '{text:2}');
        tc.testChar('*', '{text:2,op:*}');
        tc.testChar('3', '{text:3}');
        tc.testChar('=', '{text:7,op:=}');
        should(tc.observations.length).equal(1);
        should(tc.stack.length).equal(4);

        // Collapsed state is same as direct entry
        tc.clear();
        tc.testObs(number, 7, '{text:7}');
        tc.testObs(enter, '=', '{text:7,op:=}');
        should(tc.observations.length).equal(1);
        should(tc.stack.length).equal(4);
    });
    it("enter running sum", ()=>{
        var tc = new TestCalc({
            grammarFactory: gf,
            grammar: gf.buildGrammar(),
            logLevel,
        });
        var g = tc.grammar;
        
        // Observation of "enter" collapses state
        tc.testChar('1', '{text:1}');
        tc.testChar('+', '{text:1,op:+}');
        tc.testChar('2', '{text:2}');
        tc.testChar('=', '{text:3,op:=}');
        should(js.simpleString(tc.observations)).equal("[N:3]");
        tc.testChar('+', '{text:3,op:+}');
        tc.testChar('3', '{text:3}');
        tc.testChar('=', '{text:6,op:=}');
        should(js.simpleString(tc.observations)).equal("[N:6]");
        var state = js.simpleString(tc.state());

        // Collapsed state is identical to direct entry
        tc.clear();
        tc.testObs(gf.number, 6, '{text:6}');
        tc.testObs(gf.enter, '=', '{text:6,op:=}');
        should(js.simpleString(tc.observations)).equal("[N:6]");
        should(js.simpleString(tc.state())).equal(state);
    });
    it("enter increments", ()=>{
        var template = {};
        gf.add_delta_op(template);
        var grammar = gf.buildGrammar({
            template,
            addRoot: gf.add_expr_enter,
        });  
        var tc = new TestCalc({
            grammar,
            grammarFactory: gf,
            logLevel,
        });

        var g = tc.grammar;

        // plus
        tc.clear();
        tc.testChar('1', '{text:1}');
        tc.testChar('0', '{text:10}');
        tc.testChar('+', '{text:10,op:+}');
        tc.testChar('=', '{text:10,op:=}');
        tc.testChar('=', '{text:20,op:=}');
        tc.testChar('=', '{text:30,op:=}');

        // minus
        tc.clear();
        tc.testChar('2', '{text:2}');
        tc.testChar('-', '{text:2,op:-}');
        tc.testChar('=', '{text:2,op:=}');
        tc.testChar('=', '{text:0,op:=}');
        tc.testChar('=', '{text:-2,op:=}');

        // multiply
        tc.clear();
        tc.testChar('2', '{text:2}');
        tc.testChar('*', '{text:2,op:*}');
        tc.testChar('=', '{text:2,op:=}');
        tc.testChar('=', '{text:4,op:=}');
        tc.testChar('=', '{text:8,op:=}');

        // multiply
        tc.clear();
        tc.testChar('2', '{text:2}');
        tc.testChar('/', '{text:2,op:/}');
        tc.testChar('=', '{text:2,op:=}');
        tc.testChar('=', '{text:1,op:=}');
        tc.testChar('=', '{text:0.5,op:=}');
    });
    it("TESTTESTpipeline emits result observations", done=>{
        (async function() { try {
            var calc = new Calculator({ logLevel });
            var outObs = [];
            var {
                inputPromise,
                inputStream: is,
            } = await new Pipeline({ logLevel }).build(
                calc.createReadable(),
                calc,
                calc.createWritable(ob=>outObs.push(ob)),
            );

            var gf = calc.grammarFactory;
            is.push(new Observation(gf.digit, 1));
            is.push(new Observation(gf.digit, 0));
            is.push(new Observation(gf.plus, '+'));
            is.push(new Observation(gf.enter, '='));
            is.push(new Observation(gf.enter, '='));
            is.push(new Observation(gf.enter, '='));
            is.push(null); // EOS

            // check output after input is done
            //await inputPromise; 
            should.deepEqual(outObs.map(o=>o.value), [10,20,30]);
            for (var i = 0; i < outObs.length; i++) {
                should(outObs[i].tag).equal(gf.number);
                should(outObs[i]).instanceOf(Observation);
            }
            done();
        } catch(e) { done(e); }})();
    });

})
