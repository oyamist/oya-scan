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

    const GRAMMAR = {
        root: "expr",
        addOp: ALT("+", "-"),
        expr: [ OPT("addOp"), "term", STAR("addOp", "term")],
    }

    class Parser {
        constructor(opts = {}) {
            this.ob = undefined;
            this.stack = [];
            this.grammar = Object.assign({}, opts.grammar || GRAMMAR);
            this.nonTerminals = Object.keys(this.grammar).sort();
            this.nonTerminals.forEach(nt => {
                var value = this.grammar[nt];
                if (value instanceof Array) {
                    // canonical rule body
                } else {
                    this.grammar[nt] = [value]; // make canonical
                }
            });
            
        }

        static get STAR() { return STAR; } // Grammar helper
        static get ALT() { return ALT; } // Grammar helper
        static get OPT() { return OPT; } // Grammar helper

        observe(obs) {
            this.stack = this.stack.concat(obs);
        }

        observeNext() {
            this.ob
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

