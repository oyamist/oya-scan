(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        logger,
    } = require('rest-bundle');
    const Observation = require('./observation');
    const Grammar = require('./grammar');
    const STATE = (lhs, index=0, rhsData=[]) => ({ 
        lhs, 
        index, 
        rhsData,
    });

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

        arrayString(list) {
            return list.map((d,i)=> d instanceof Array 
                ? `[${this.arrayString(d)}]` 
                : ""+d
            );
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
                var rhsText = this.arrayString(rhsData);
                var msg = `${lhs}(${rhsText})`;
                logger[this.logLevel](
                    `${name}.reduce ${msg} [${this.state()}]`);
            }
        }

        onShift(ob) {
            if (this.logLevel) {
                var name = this.constructor.name;
                logger[this.logLevel](
                    `${name}.shift ${ob} [${this.state()}]`);
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
                var rule = Grammar.ruleToString(lhs);
                logger[this.logLevel](
                    `${name}.reject(${ob}) at rhs[${index}]\n`+
                    `    ${rule}`);
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
                s1.rhsData[s1.index] = s0.rhsData;
                s1.index++;
            }

            return true;
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
                logger[logLevel](`${name}.observe(${ob})`);
            }

            lookahead.push(ob);
            if (stack.length === 0) {
                stack[0] = STATE("root");
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
            var sym = lookahead[0] && lookahead[0].tag;
            var rhs = grammar.rhs(stack[0].lhs);
            var rhsi = rhs[stack[0].index];
            if (rhsi !== sym) {
                return false;
            }
            var ob = lookahead.shift();
            this.shift(ob);
            stack[0].rhsData.push(ob);
            stack[0].index++;
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
            if (grammar.hasOwnProperty(arg)) {
                var s1 = STATE(arg);
                stack.unshift(s1); // depth first guess
                var ok = this.step();
                if (ok) {
                    this.reduce(false);
                    matched.push(s1.rhsData);
                    if (max1) {
                        s0.index++;
                    }
                    return true;
                } 
                // not matched
                stack.shift(); // discard guess
                if (min1 && matched.length === 0) {
                    return false;
                } 
            } else if (arg === sym) { // matches current symbol
                do {
                    var ob = lookahead.shift();
                    matched.push(ob);
                    this.shift(ob);
                    if (max1) {
                        s0.index++;
                        return true;
                    }
                    sym = lookahead[0] && lookahead[0].tag;
                } while (arg === sym);
                return true;
            } else if (min1 && matched.length === 0) {
                return false;
            }
            stack[0].index++;
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
            var matched = s0.rhsData[index] || [];
            s0.rhsData[index] = matched;
            for (var iArg = 0; iArg < args.length; iArg++) {
                var arg = args[iArg];
                if (grammar.hasOwnProperty(arg)) {
                    var s1 = STATE(arg);
                    stack.unshift(s1); // depth first guess
                    var ok = this.step();
                    if (ok) {
                        this.reduce(false);
                        s0.rhsData[index] = s1.rhsData;
                        s0.index++;
                        return true;
                    } 
                    // not matched
                    stack.shift(); // discard guess
                } else if (arg === sym) { // matches current symbol
                    var ob = lookahead.shift();
                    s0.rhsData[index] = ob;
                    this.shift(ob);
                    s0.index++;
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
            if (grammar.hasOwnProperty(rhsi)) { // non-terminal
                stack.unshift(STATE(rhsi));
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

        state() {
            return this.stack.map(s => `${s.lhs}_${s.index}`);
        }

    }

    module.exports = exports.Parser = Parser;
})(typeof exports === "object" ? exports : (exports = {}));

