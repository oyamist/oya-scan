(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        js,
        logger,
    } = require('just-simple').JustSimple;
    const Observation = require('./observation');
    const Grammar = require('./grammar');
    class RuleState {
        constructor(lhs, index=0, rhsData=[]) {
            this.lhs = lhs;
            this.index = index;
            this.rhsData = rhsData || null;
        }

        get id() { return `${this.lhs}_${this.index}`; }

        toString() {
            var {
                lhs,
                index,
                rhsData,
            } = this;
            return `${this.id}:${js.simpleString(rhsData)}`;
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
            this.name = opts.name || this.constructor.name;
            logger.logInstance(this, opts);
            this.grammar = new Grammar(opts.grammar);
            this.logStack = opts.logStack || 2; // stack elements to log
            this.answers = [];
            this.maxAnswers = opts.maxAnswers || 3;
            this.tagClear = opts.tagClear || 'clear';
            this.tagUndo = opts.tagUndo || 'undo';
            this.maxObservations = opts.maxObservations || 
                100; // streaming parsers should not accumulate stuff
            this.clear();
            
            Object.defineProperty(this, "observations", {
                writable: true,
                value: [],
            });
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

        onClear() {
            this.log(`clear() awaiting input`);
        }

        onReady() {
            this.log(`awaiting input`);
        }

        onReduce(tos) { 
            // override this to change what is returned on reduce
            var d = tos.rhsData;
            return d instanceof Array && d.length===1
                ? d[0] : d;
        }

        onShift(ob) {
            var {
                name,
                logStack,
            } = this;
            this.log(`shift(${ob}) ${this.state(0,logStack)}`);
        }

        onReject(ob) {
            if (!this.logLevel) {
                return;
            }

            this.log([
                `reject(${ob})`,
                `STACK => ${this.state()}`,
                //`${this.grammar}`,
            ].join('\n'));
        }

        onAdvance(state, label) {
            if (!this.logLevel) {
                return;
            }
            var {
                name,
                logStack,
            } = this;
            var {
                lhs,
                index,
                rhsData,
            } = state;
            this.log(`advance(${state.id}) `+
                `${this.state(0,logStack)} @${label}`);
        }

        reduce(advance, required) {
            var {
                stack,
                grammar,
                logLevel,
                logStack,
                name,
                maxAnswers,
                answers,
            } = this;
            if (advance == null || required == null) {
                throw new Error("reduce(advance?, required?)");
            }
            var s0 = stack[0];
            var s1 = stack[1];
            if (!s0 || s0.index < grammar.rhs(s0.lhs).length) {
                if (required) {
                    this.cannot(`reduce(${s0.id})`, 
                        `not end of rule`);
                }
                return false; // not at end of rule
            }

            if (advance !== this.advanceOnReduce(s1)) {
                //throw new Error(`advance mismatch ${advance} ${s1}\n${grammar}`);
            }
            stack.shift();
            var s0Data = this.onReduce.call(this, s0);
            if (s1) {
                if (advance) {
                    s1.rhsData[s1.index] = s0Data;
                } else {
                    s1.rhsData[s1.index].push(s0Data);
                }
            }
            if (advance) {
                if (s1) {
                    this.advance(s1, `reduce(${s0.lhs})`);
                } else {
                    answers.unshift(s0Data);
                    if (answers.length > maxAnswers) {
                        this.answers = answers.slice(0, maxAnswers);
                    }
                }
            }

            if (logLevel) {
                var a = advance ? 'A' : (advance === false ? 'a' : '?');
                var r = required ? 'R' : (required === false ? 'r' : '?');
                this.log(`reduce(${s0.lhs},${a},${r}) `+
                    `${this.state(0,logStack)}`);
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
            var e = new Error(
                `Invalid observation:${js.simpleString(ob)}`);
            e.observation = ob;
            throw e;
        }

        undo() {
            var obs = this.observations;
            if (obs.length === 0) {
                return null;
            }
            this.clear();
            var ob = obs.pop();
            obs.forEach(ob => this.observe(ob));
            return ob;
        }

        clear() {
            this.observations = [];
            this.answers = [];
            this.lookahead = []; // input observations
            this.stack = []; // execution stack
            this.obError = undefined;
            this.onClear();
        }

        reduceMaybe() {
            var {
                stack,
            } = this;
            var advance = this.advanceOnReduce(stack[1]);
            while (this.reduce(advance, false)) {
                advance = this.advanceOnReduce(stack[1]);
            }
        }

        enter(ob) {
            this.log(`enter(${ob}) ignored`);
            return true;
        }

        observe(ob) {
            this.log(`----- observe(${ob}) -----`);
            try {
                var obError = this.obError;
                if (obError && ob.toString() === obError.toString()) {
                    this.clear();
                }
                var {
                    tagClear,
                    tagUndo,
                    lookahead,
                    stack,
                    observations,
                } = this;

                if (ob.tag === tagClear) {
                    this.clear();
                    return null;
                }
                if (ob.tag === tagUndo) {
                    this.undo();
                    return null;
                }

                if (observations.length >= this.maxObservations) {
                    // Streaming parsers should not accumulate too much
                    // state since streaming is unbounded by design.
                    // Observations are cumulative and must be cleared
                    // periodically. For example, "enter" can be used
                    // to collapse state and prevent runaway state increase.
                    throw new Error(
                        `Too many observations: ${this.maxObservations}`);
                }
                observations.push(ob);

                if (stack.length === 0) {
                    stack[0] = new RuleState("root");
                }

                return this.processObservation(ob) 
            } catch(e) {
                e.observation = ob;
                logger.warn(e.stack);
                throw e;
            }
        }

        processObservation(ob) {
            var {
                lookahead,
            } = this;
            lookahead.push(ob);

            var res = this.step();
            if (res) {
                this.obError = undefined;
                this.reduceMaybe();
                if (!this.isParsing) {
                    this.onReady();
                }
            } else {
                this.lookahead.length && this.lookahead.shift();
                this.obError = ob;
                this.reject(ob);
            }

            // Observation sinks return null.
            // Observation transforms can return an observation
            // synchronusly by returning here or
            // asynchronously by transform.push(ob)
            return null; 
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
                this.cannot(`stepTerminal(${s0.id})`, 
                    `${sym} !== ${rhsi}`);
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
                var ob = lookahead.shift();
                matched.push(ob);
                this.shift(ob);
                if (max1) {
                    this.advance(s0, 'stepStar-OptT');
                    return true;
                }
                return true;
            }

            if (grammar.rhs(arg)) { // nonterminal
                if (grammar.isFirst(sym, arg)) {
                    var s1 = new RuleState(arg);
                    stack.unshift(s1); // depth first guess
                    var stackLen = stack.length;
                    var ok = this.step();
                    if (ok) {
                        while (stack.length > stackLen) {
                            if (!this.reduce(true, false)) {
                                break;
                            }
                        }
                        var rqd = (grammar.rhs(arg).length === 1);
                        var reduced = this.reduce(false, rqd);
                        if (reduced && max1) {
                            this.advance(s0, `stepStar-OptNT${reduced}`);
                        }
                        return true;
                    } 
                    stack.shift(); // match failed, discard guess
                }
            }

            if (min1 && matched.length === 0) {
                this.cannot(`stepStar()`, 
                    `expected at leat one match`);
                return false; // mandatory match failed
            }

            this.advance(stack[0], 'stepStarSkip'); // empty match
            return this.step();
        }

        advanceOnReduce(state) {
            var advance = true;
            if (state) {
                var rhs = this.grammar.rhs(state.lhs);
                var rhsi = rhs[state.index];
                if (rhsi == null) {
                    throw new Error(`Invalid state:${state}`);
                }
                var ebnf = rhsi.ebnf;
                advance =  ebnf !== '*' && ebnf !== '+';
            }
            return advance;
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
                    if (grammar.isFirst(sym, arg)) {
                        var s1 = new RuleState(arg);
                        stack.unshift(s1); // depth first guess
                        var ok = this.step();
                        if (ok) {
                            this.reduce(true, true);
                            return true;
                        } 
                        // not matched
                        stack.shift(); // discard guess
                    }
                } else if (arg === sym) { // matches current symbol
                    var ob = lookahead.shift();
                    s0.rhsData[index] = ob;
                    this.shift(ob);
                    this.advance(s0, `stepAltT${iArg}`);
                    return true;
                }
            }
            this.cannot(`stepAlt()`, 
                `${sym} not alternate for ${lhs}`);
            return false;
        }

        cannot(loc, msg) {
            this.log(`cannot(${loc}) ${msg}`);
        }

        step() {
            var {
                grammar,
                stack,
                logLevel,
            } = this;
            this.reduceMaybe();
            if (stack.length === 0) {
                this.cannot(`step()`, `empty stack`);
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

        state(index=0, n=this.stack.length-index) {
            var {
                stack,
            } = this;
            var end = Math.min(this.stack.length, index+n);
            var sv = stack.slice(index, end).map(s => `${s}`);

            if (end < this.stack.length) {
                sv.push('...');
            }

            return sv.join('; ');
        }

    }

    module.exports = exports.Parser = Parser;
})(typeof exports === "object" ? exports : (exports = {}));

