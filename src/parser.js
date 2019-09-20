(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        logger,
    } = require('rest-bundle');
    const Observation = require('./observation');

    // Grammer helpers
    const STAR = (...args) => ({
        op: "*", // zero or more
        args,
    });
    const OPT = (...args) => ({
        op: "?", // zero or one (optional)
        args,
    });
    const ALT = (...args) => ({
        op: "|", // alternation
        args,
    });
    const STATE = (nonTerminal, index=0, rhs=[]) => ({ 
        nonTerminal, 
        index, 
        rhs,
    });

    const GRAMMAR = {
        root: "expr",
        addOp: ALT("+", "-"),
        expr: [ OPT("addOp"), "term", STAR("addOp", "term")],
    }

    class Parser {
        constructor(opts = {}) {
            this.ob = undefined;
            this.grammar = Object.assign({}, opts.grammar || GRAMMAR);
            this.nonTerminals = Object.keys(this.grammar).sort();
            this.nonTerminals.forEach(nt => {
                var value = this.grammar[nt];
                if (value instanceof Array) {
                    // canonical rule body
                } else {
                    value = [value];
                    this.grammar[nt] = value; // make canonical
                }

            });

            // optional callbacks
            var that = this;
            var reduce = opts.reduce || ((nt, rhs) => that.onReduce(nt,rhs));
            Object.defineProperty(this, "reduce", {
                writable: true,
                value: reduce,
            });
            var shift = opts.shift || (ob => that.onShift(ob));
            Object.defineProperty(this, "shift", {
                writable: true,
                value: shift,
            });
            var reject = opts.reject || (ob => that.onReject(ob));
            Object.defineProperty(this, "reject", {
                writable: true,
                value: reject,
            });
            
            this.clearAll();
        }

        static get STAR() { return STAR; } // Grammar helper
        static get ALT() { return ALT; } // Grammar helper
        static get OPT() { return OPT; } // Grammar helper

        onReduce(lhs, rhs) { // default handler
            console.log(`Parser.onReduce(`,
                `${lhs}(${rhs.map(a=>a.tag)}))`,
                this.state());
            return `${lhs}-some-result`;
        }

        onShift(ob) { // default handler
            console.log(`Parser.onShift(${ob})`, this.state());
        }

        onReject(ob) { // default handler
            console.log(`Parser.onReject(${ob})`, this.state());
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
            if (!res) {
                this.reject(ob);
                this.clearObservation();
            }
            return res;
        }

        step() {
            var {
                grammar,
                stack,
                lookahead,
            } = this;
            if (this.stack.length === 0) {
                stack.unshift(STATE("root"));
            }
            var tos = stack[0];
            var sym = lookahead[0] && lookahead[0].tag;
            var rhs = grammar[stack[0].nonTerminal];
            if (!rhs) {
                return false;
            }
            var rhsi = rhs[stack[0].index];
            if (grammar.hasOwnProperty(rhsi)) { // non-terminal
                stack.unshift(STATE(rhsi));
                return this.step();
            } 
            if (typeof rhsi === 'string') { // terminal
                if (rhsi !== sym) {
                    return false;
                }
                var ob = lookahead.shift();
                this.shift(ob);
                stack[0].rhs.push(ob);
                stack[0].index++;
                while (stack[0] && stack[0].index >= rhs.length) {
                    var resReduce = this.reduce(
                        stack[0].nonTerminal, stack[0].rhs);
                    stack.shift();
                    if (stack[0]) {
                        rhs = grammar[stack[0].nonTerminal];
                        stack[0].index++;
                        stack[0].rhs.push(resReduce);
                    }
                }
                return true;
            }
            if (rhsi.op === "?") {
            }
            if (rhsi.op === "|") {
            }
            if (rhsi.op === "*") {
            }

        }

        state() {
            return this.stack.map(s => `${s.nonTerminal}_${s.index}`);
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

