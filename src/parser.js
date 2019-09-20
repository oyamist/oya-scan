(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        logger,
    } = require('rest-bundle');
    const Observation = require('./observation');

    // Grammar helpers
    const STAR = (...args) => ({
        ebnf: "*", // zero or more
        args,
    });
    const PLUS = (...args) => ({
        ebnf: "+", // one or more
        args,
    });
    const OPT = (...args) => ({
        ebnf: "?", // zero or one (optional)
        args,
    });
    const ALT = (...args) => ({
        ebnf: "|", // alternation
        args,
    });
    const STATE = (nonterminal, index=0, rhs=[]) => ({ 
        nonterminal, 
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
            var grammar = opts.grammar || GRAMMAR;
            this.grammar = Parser.validateGrammar(grammar);

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

        static get STAR() { return STAR; } // Grammar helper zero or more
        static get PLUS() { return PLUS; } // Grammar helper one or more
        static get ALT() { return ALT; } // Grammar helper alternation
        static get OPT() { return OPT; } // Grammar helper zero or one

        static validateGrammar(grammar) {
            if (grammar == null) {
                throw new Error(`Grammar cannot be empty`);
            }
            grammar = Object.assign({}, grammar);
            var nts = Object.keys(grammar).sort();
            nts.forEach(nt => {
                var value = grammar[nt];
                if (value instanceof Array) {
                    // canonical rule body
                } else {
                    value = [value];
                    grammar[nt] = value; // make canonical
                }
            });
            var nts = Object.keys(grammar);
            if (nts.length === 0) {
                throw new Error(`Grammar has no rules`);
            }
            nts.forEach(lhs => {
                var rhs = grammar[lhs];
                if (!rhs) {
                    throw new Error(`Grammar has no rule for:"${lhs}"`);
                }
                var rhs = grammar[lhs];
                if (!(rhs instanceof Array)) {
                    throw new Error(
                        `${lhs}: rhs must be Array ${rhs}`);
                } 
            });
            return grammar;
        }

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

        stepTerminal() {
            var {
                grammar,
                stack,
                lookahead,
            } = this;
            var sym = lookahead[0] && lookahead[0].tag;
            var rhs = grammar[stack[0].nonterminal];
            var rhsi = rhs[stack[0].index];
            if (rhsi !== sym) {
                return false;
            }
            var ob = lookahead.shift();
            this.shift(ob);
            stack[0].rhs.push(ob);
            stack[0].index++;
            while (stack[0] && stack[0].index >= rhs.length) {
                var resReduce = this.reduce(
                    stack[0].nonterminal, stack[0].rhs);
                stack.shift();
                if (stack[0]) {
                    rhs = grammar[stack[0].nonterminal];
                    stack[0].index++;
                    stack[0].rhs.push(resReduce);
                }
            }
            return true;
        }

        stepStar() { // zero or more
            var {
                grammar,
                stack,
            } = this;
            var nonterminal = stack[0].nonterminal;
            var rhs = grammar[nonterminal];
            var rhsi = rhs[stack[0].index];
            var args = rhsi.args;

            console.log(`dbg args`, args);
            return true;
        }

        step() {
            var {
                grammar,
                stack,
            } = this;
            var nonterminal = stack[0].nonterminal;
            var rhs = grammar[nonterminal];
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

            throw new Error(`${nonTerminal} Invalid rhs`);

        }

        state() {
            return this.stack.map(s => `${s.nonterminal}_${s.index}`);
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

