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
            this.ob = undefined;
            this.grammar = new Grammar(opts.grammar);
            this.clearAll();
            this.logLevel = opts.logLevel; // error, warn, info, debug
        }

        dumpList(list) {
            return list.map((d,i)=> d instanceof Array 
                ? `[${this.dumpList(d)}]` 
                : ""+d
            );
        }

        onReduce(tos) { 
            if (this.logLevel) {
                var {
                    lhs,
                    rhsData,
                } = tos;
                var name = this.constructor.name;
                var rhsText = this.dumpList(rhsData);
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
                logger[this.logLevel](
                    `${name}.reject ${ob} [${this.state()}]`);
            }
        }

        reduce(advance=true) {
            var {
                stack,
                grammar,
            } = this;
            var s0 = stack[0];
            var s1 = stack[1];
            if (!s0 || s0.index < grammar[s0.lhs].length) {
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
        }

        observe(ob) {
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
                while (this.reduce()) {}
            } else {
                this.reject(ob);
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
            var rhs = grammar[stack[0].lhs];
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
            var rhs = grammar[lhs];
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

        step() {
            var {
                grammar,
                stack,
            } = this;
            while (this.reduce()) {}
            var lhs = stack[0].lhs;
            var rhs = grammar[lhs];
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

            //if (rhsi.ebnf === "|") { }

            throw new Error(`${lhs} Invalid rhs`);

        }

        state() {
            return this.stack.map(s => `${s.lhs}_${s.index}`);
        }

        peek(tag) {
            var {
                ob,
            } = this;
            if (ob == null) {
                throw new Error("No observations to parse");
            }
            if (ob.tag !== tag) {
                return false;
            }

            observeNext();
            return true;
        }

        expect(tag) {
            var {
                ob,
            } = this;
            if (ob == null) {
                throw new Error("No observations to parse");
            }
            if (tag !== ob.tag) {
                throw new Error(`Expected ${tag}`);
            }

            return true;
        }

        number() {
        }
    }

    module.exports = exports.Parser = Parser;
})(typeof exports === "object" ? exports : (exports = {}));

