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
    const STATE = (nonTerminal, index=0, args=[]) => ({ 
        nonTerminal, 
        index, 
        args,
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
            var reduce = opts.reduce || ((nt, args) => that.onReduce(nt,args));
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

        onReduce(nt, args) { // default handler
            console.log(`Parser.onReduce(`,
                `${nt}(${args.map(a=>a.tag)}))`,
                this.state());
        };

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
            this.stack = [STATE("root")]; // execution stack
        }

        observe(ob) {
            var {
                lookahead,
            } = this;

            lookahead.push(ob);
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
            var lhs = tos.nonTerminal;
            var rhs = grammar[lhs];
            if (!rhs) {
                return false;
            }
            var rhsi = rhs[tos.index];
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
                tos.args.push(ob);
                tos.index++;
                if (tos.index >= rhs.length) {
                    stack.shift();
                    stack.length && stack[0].index++;
                    this.reduce(tos.nonTerminal, tos.args);
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

