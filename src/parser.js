(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const js = require('just-simple').JustSimple.js;
    const logger = require('just-simple').JustSimple.js.logger;
    const Observation = require('./observation');
    const Grammar = require('./grammar');
    class RuleState {
        constructor(lhs, index=0, rhsData=[]) {
            this.lhs = lhs;
            this.index = index;
            this.rhsData = rhsData || null;
        }
        toString() {
            var {
                lhs,
                index,
                rhsData,
            } = this;
            return `${lhs}_${index}:${js.simpleString(rhsData)}`;
        }

    }

    const {
        ALT,
        PLUS,
        OPT,
        STAR,
    } = Grammar;

    class Parser {
        constructor(opts = {}) {
            this.logLevel = opts.logLevel; // error, warn, info, debug
            this.grammar = new Grammar(opts.grammar);
            this.firstMap = {};
            this.clearAll();
        }

        get isParsing() {
            var {
                stack,
                lookahead,
            } = this;
            if (stack.length===0 && lookahead.length===0) {
                return false;
            }
            return true;
        }

        onReady() {
            if (this.logLevel) {
                var name = this.constructor.name;
                var msg = `${name} awaiting input`;
                logger[this.logLevel](msg);
            }
        }

        onReduce(tos) { 
            if (this.logLevel) {
                var {
                    lhs,
                    rhsData,
                } = tos;
                var name = this.constructor.name;
                var rhsText = js.simpleString(rhsData);
                var msg = `${lhs}(${rhsText})`;
                logger[this.logLevel](
                    `${name}.reduce ${this.state(0,2)}`);
            }
        }

        onShift(ob) {
            if (this.logLevel) {
                var name = this.constructor.name;
                logger[this.logLevel](
                    `${name}.shift(${ob}) [${this.state(0,2)}]`);
            }
        }

        onReject(ob) {
            if (this.logLevel) {
                var name = this.constructor.name;
                var {
                    lhs,
                    args,
                    index,
                } = this.stack[0];
                var rule = this.grammar.ruleToString(lhs);
                logger[this.logLevel](
                    `${name}.reject(${ob}) at rhs[${index}]\n`+
                    `    ${rule}`);
            }
        }

        onAdvance(state, label) {
            if (this.logLevel) {
                var name = this.constructor.name;
                var {
                    lhs,
                    index,
                    rhsData,
                } = state;
                logger[this.logLevel](
                    `${name}.advance(`+
                    `${lhs}_${index-1}.rhsData = `+
                    `${js.simpleString(rhsData[index-1])})`+
                    ` at ${label}`);
            }
        }

        reduce(advance=true) {
            var {
                stack,
                grammar,
            } = this;
            var s0 = stack[0];
            var s1 = stack[1];
            if (!s0 || s0.index < grammar.rhs(s0.lhs).length) {
                return false; // not at end of rule
            }

            this.onReduce.call(this, s0);
            stack.shift();
            if (s1 && advance) {
                s1.rhsData[s1.index] = s0.rhsData || null;
                this.advance(s1, 'reduce');
            }

            return true;
        }

        advance(state, label) {
            state.index++;
            this.onAdvance(state, label);
        }

        shift(ob) {
            this.onShift(ob);
        }

        reject(ob) {
            this.onReject(ob);
        }

        clearObservation() {
            this.lookahead.length && this.lookahead.shift();
        }

        clearAll() {
            this.lookahead = []; // input observations
            this.stack = []; // execution stack
            this.obError = undefined;
            this.onReady();
        }

        observe(ob) {
            var obError = this.obError;
            if (obError && ob.toString() === obError.toString()) {
                this.clearAll();
            }
            var {
                lookahead,
                logLevel,
                stack,
            } = this;

            if (logLevel) {
                var name = this.constructor.name;
                logger[logLevel](
                    `----- ${name}.observe(${ob}) -----`);
            }

            lookahead.push(ob);
            if (stack.length === 0) {
                stack[0] = new RuleState("root");
            }
            var res = this.step();
            if (res) {
                this.obError = undefined;
                while (this.reduce()) {}
                if (!this.isParsing) {
                    this.onReady();
                }
            } else {
                this.reject(ob);
                this.obError = ob;
                this.clearObservation();
            }
            return res;
        }

        stepTerminal() {
            var {
                grammar,
                stack,
                lookahead,
            } = this;
            var s0 = stack[0];
            var sym = lookahead[0] && lookahead[0].tag;
            var rhs = grammar.rhs(s0.lhs);
            var rhsi = rhs[s0.index];
            if (rhsi !== sym) {
                return false;
            }
            var ob = lookahead.shift();
            this.shift(ob);
            s0.rhsData.push(ob);
            this.advance(s0, 'stepTerminal');
            return true;
        }

        stepStar(min1=false, max1=false) {
            var {
                grammar,
                stack,
                lookahead,
            } = this;
            var s0 = stack[0];
            var lhs = s0.lhs;
            var index = s0.index;
            var rhs = grammar.rhs(lhs);
            var rhsi = rhs[index];
            var arg = rhsi.args[0]; // STAR is monadic
            var sym = lookahead[0] && lookahead[0].tag;
            var matched = s0.rhsData[index] || [];
            s0.rhsData[index] = matched;

            if (arg === sym) { // terminal matches symbol
                do {
                    var ob = lookahead.shift();
                    matched.push(ob);
                    this.shift(ob);
                    if (max1) {
                        this.advance(s0, 'stepStar-OptT');
                        return true;
                    }
                    sym = lookahead[0] && lookahead[0].tag;
                } while (arg === sym);
                return true;
            }

            if (grammar.rhs(arg)) { // nonterminal
                var s1 = new RuleState(arg);
                stack.unshift(s1); // depth first guess
                var ok = this.step();
                if (ok) {
                    this.reduce(false);
                    matched.push(s1.rhsData);
                    if (max1) {
                        this.advance(s0, 'stepStar-OptNT');
                    }
                    return true;
                } 
                stack.shift(); // match failed, discard guess
            }

            if (min1 && matched.length === 0) {
                return false; // mandatory match failed
            }

            this.advance(stack[0], 'stepStarSkip'); // empty match
            return this.step();
        }

        stepAlt() { 
            var {
                grammar,
                stack,
                lookahead,
            } = this;
            var s0 = stack[0];
            var lhs = s0.lhs;
            var index = s0.index;
            var rhs = grammar.rhs(lhs);
            var rhsi = rhs[index];
            if (rhsi.ebnf !== '|') {
                throw new Error(`${lhs}_${index}: expected ALT node`);
            }
            var args = rhsi.args;
            var sym = lookahead[0] && lookahead[0].tag;
            s0.rhsData[index] = null;
            for (var iArg = 0; iArg < args.length; iArg++) {
                var arg = args[iArg];
                if (grammar.rhs(arg)) {
                    var s1 = new RuleState(arg);
                    stack.unshift(s1); // depth first guess
                    var ok = this.step();
                    if (ok) {
                        this.reduce(true);
                        return true;
                    } 
                    // not matched
                    stack.shift(); // discard guess
                } else if (arg === sym) { // matches current symbol
                    var ob = lookahead.shift();
                    s0.rhsData[index] = ob;
                    this.shift(ob);
                    this.advance(s0, `stepAltT${iArg}`);
                    return true;
                }
            }
            return false;
        }

        step() {
            var {
                grammar,
                stack,
            } = this;
            while (this.reduce()) {}
            if (stack.length === 0) {
                return false;
            }
            var lhs = stack[0].lhs;
            var rhs = grammar.rhs(lhs);
            var index = stack[0].index;
            var rhsi = rhs[index];
            if (rhsi == null) {
                throw new Error(`Parse error: ${lhs}_${index} does not exist`);
            }
            if (grammar.rhs(rhsi)) { // non-terminal
                stack.unshift(new RuleState(rhsi));
                return this.step();
            } 
            if (typeof rhsi === 'string') { // terminal
                return this.stepTerminal();
            }
            if (rhsi.ebnf === "*") {
                return this.stepStar(false, false);
            }
            if (rhsi.ebnf === "+") { 
                return this.stepStar(true, false);
            }
            if (rhsi.ebnf === "?") { 
                return this.stepStar(false, true);
            }

            if (rhsi.ebnf === "|") { 
                return this.stepAlt();
            }

            throw new Error(`${lhs} has invalid rhs:${rhs}`);
        }

        state(index=0, end=this.stack.length) {
            var {
                stack,
            } = this;
            var sv = stack.slice(index, end)
                .map(s => `${s}`);

            if (end < this.stack.length) {
                sv.push('...');
            }

            var s =  sv.join(', ');
            return s;
        }

        first(sym) {
            var {
                grammar,
                firstMap,
            } = this;
            var f = firstMap[sym];
            if (f) {
                return f;
            }

            var rhs = grammar.rhs(sym);
            if (!rhs) {
                return (firstMap[sym] = {[sym]:true});
            }

            f = {};
            var ebnf = rhs[0].ebnf;
            if (!ebnf) {
                firstMap[sym] = Object.assign(f, this.first(rhs[0]));
                return f;
            }

            for (var i = 0; i < rhs.length; i++) {
                var {
                    ebnf,
                    args,
                } = rhs[i];
                if (ebnf == null) {
                    Object.assign(f, this.first(rhs[i]));
                    break;
                } else if (ebnf === '?') {
                    Object.assign(f, this.first(args[0]));
                } else if (ebnf === '*') {
                    Object.assign(f, this.first(args[0]));
                } else if (ebnf === '|') {
                    for (var j = 0; j < args.length; j++) {
                        var arg = args[j];
                        Object.assign(f, this.first(arg));
                    }
                    break;
                } else if (ebnf === '+') {
                    Object.assign(f, this.first(args[0]));
                    break;
                } else {
                    f = this.first(rhs[i]);
                    break;
                }
            }
            return f;
        }

    }

    module.exports = exports.Parser = Parser;
})(typeof exports === "object" ? exports : (exports = {}));

