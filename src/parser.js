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
            this.listener = opts.listener || this;
            this.reduce = opts.reduce || Parser.ON_REDUCE;
            this.shift = opts.shift || Parser.ON_SHIFT;
            this.clear();
            
        }

        static get STAR() { return STAR; } // Grammar helper
        static get ALT() { return ALT; } // Grammar helper
        static get OPT() { return OPT; } // Grammar helper

        onReduce(nt, args) { // listener default
            console.log(`Parser.onReduce()`,
                `${nt}(${args.map(a=>a.tag)})`,
                this.state());
        };

        onShift(ob) { // listener default
            var value = ob.value;
            if (value instanceof Date) {
                value = value.toLocaleDateString();
            }
            var text = ob.hasOwnProperty('text') && ob.text || '';
            console.log(`Parser.onShift()`,
                `${ob.tag}:${value} ${text}`,
                this.state());
        }

        clear() {
            this.obsIn = []; // input observations
            this.stack = [STATE("root")]; // execution stack
        }

        observe(ob) {
            this.obsIn.push(ob);
            return this.step();
        }

        step() {
            var {
                grammar,
                stack,
                obsIn,
                listener,
            } = this;
            if (this.stack.length === 0) {
                stack.unshift(STATE("root"));
            }
            var tos = stack[0];
            var sym = obsIn[0] && obsIn[0].tag;
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
                var ob = obsIn.shift();
                listener.onShift(ob);
                tos.args.push(ob);
                tos.index++;
                if (tos.index >= rhs.length) {
                    stack.shift();
                    stack.length && stack[0].index++;
                    listener.onReduce(tos.nonTerminal, tos.args);
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

