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

            // optional callbacks
            var that = this;
            Object.defineProperty(this, "onReduce", {
                writable: true,
                value: opts.onReduce || ((lhs, rhsData) => { 
                    console.log(`Parser.onReduce(`,
                        `${lhs}(${rhsData.map(d=>JSON.stringify(d))}))`,
                        this.state());
                    return `${lhs}-some-result`;
                }),
            });
            Object.defineProperty(this, "onShift", {
                writable: true,
                value: opts.onShift || (ob => { 
                    console.log(`Parser.onShift(${ob})`, this.state());
                }),
            });
            Object.defineProperty(this, "onReject", {
                writable: true,
                value: opts.onReject || (ob => { 
                    console.log(`Parser.onReject(${ob})`, this.state());
                }),
            });
            
            this.clearAll();
        }

        reduce() {
            var {
                stack,
            } = this;
            var resReduce = this.onReduce(
                stack[0].lhs, // lhs
                stack[0].rhsData);
            stack.shift();
            if (stack[0]) {
                stack[0].index++;
                stack[0].rhsData.push(resReduce);
            }

            return resReduce;
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
            if (!res) {
                this.reject(ob);
                this.clearObservation();
            }
            return res;
        }

        reduceMaybe() {
            var {
                grammar,
                stack,
            } = this;
            while (stack[0] && stack[0].index >= 
                grammar[stack[0].lhs].length) 
            {
                this.reduce();
            }
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
            this.reduceMaybe();
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
            console.log(`dbg stepStar`,
                `${lhs}_${index}`, // current rule and index
                `${JSON.stringify(rhs)}`);
            if (grammar.hasOwnProperty(arg)) {
                throw new Error(`TBD ${arg}`);
            } else if (arg === sym) { // matches current symbol
                var ob = lookahead.shift();
                this.shift(ob);
                stack[0].index++;
                this.reduceMaybe();
            }
            return true;
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

