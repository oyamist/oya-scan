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

        onReduce(lhs, rhsData) { 
            if (this.logLevel) {
                var name = this.constructor.name;
                var msg = `${lhs}(${rhsData.map(d=>""+d)})`;
                logger[this.logLevel](
                    `${name}.reduce ${msg} [${this.state()}]`);
            }
            return `${lhs}-result`; // arbitrary client data
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

        reduce() {
            var s = this.stack;
            var g = this.grammar;
            if (!s[0] || s[0].index < g[s[0].lhs].length) {
                return false;
            }
            var resReduce = this.onReduce.call(this,
                s[0].lhs, // lhs
                s[0].rhsData);
            s.shift();
            if (s[0]) {
                s[0].index++;
                s[0].rhsData.push(resReduce);
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
                stack,
            } = this;

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

        stepStar() { // zero or more
            var {
                grammar,
                stack,
                lookahead,
            } = this;
            var lhs = stack[0].lhs;
            var index = stack[0].index;
            var rhs = grammar[lhs];
            var rhsi = rhs[index];
            var arg = rhsi.args[0]; // STAR is monadic
            var sym = lookahead[0] && lookahead[0].tag;
            var matched = stack[0].rhsData[index] || [];
            stack[0].rhsData[index] = matched;
            if (grammar.hasOwnProperty(arg)) {
                stack.unshift(STATE(arg)); // depth first guess
                console.log(`dbg stepStar 1 guessing: [${this.state()}]`);
                var ok = this.step();
                if (ok) {
                    var tos = stack.shift();
                    matched.push(tos.rhsData);
                    console.log(`dbg stepStar 2 matched:`, matched, 
                        `${tos}`);
                    return true;
                } else {
                    console.log(`dbg stepStar 3 !ok matched:`, matched);
                } 
                if (matched.length) {
                    console.log(`dbg stepStar 4 star matched:`, matched);
                } else {
                    var tos = stack.shift(); // discard guess
                    console.log(`dbg stepStar 5 pop:`+JSON.stringify(tos));
                }
            } else if (arg === sym) { // matches current symbol
                do {
                    var ob = lookahead.shift();
                    matched.push(ob);
                    this.shift(ob);
                    sym = lookahead[0] && lookahead[0].tag;
                } while (arg === sym);
                return true;
            }
            stack[0].index++;
            return this.step();
        }

        step() {
            var {
                grammar,
                stack,
            } = this;
            var lhs = stack[0].lhs;
            var rhs = grammar[lhs];
            var rhsi = rhs[stack[0].index];
            if (grammar.hasOwnProperty(rhsi)) { // non-terminal
                stack.unshift(STATE(rhsi));
                return this.step();
            } 
            if (typeof rhsi === 'string') { // terminal
                return this.stepTerminal();
            }
            if (rhsi.ebnf === "*") {
                return this.stepStar();
            }

            //if (rhsi.ebnf === "+") { }
            //if (rhsi.ebnf === "?") { }
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

