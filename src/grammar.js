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

    const GRAMMAR = {
        root: "expr",
        addOp: ALT("+", "-"),
        expr: [ OPT("addOp"), "term", STAR("addOp", "term")],
    }

    class Grammar {
        constructor(g = GRAMMAR) {
            g = JSON.parse(JSON.stringify(g));
            Object.assign(this, g);
            this.validate();
        }

        static get STAR() { return STAR; } // Grammar helper zero or more
        static get PLUS() { return PLUS; } // Grammar helper one or more
        static get ALT() { return ALT; } // Grammar helper alternation
        static get OPT() { return OPT; } // Grammar helper zero or one

        validate() {
            var nts = Object.keys(this).sort();
            if (nts.length === 0) {
                throw new Error(`Grammar has no rules`);
            }
            if (!this.hasOwnProperty('root')) {
                throw new Error(`Expected rule for "root"`);
            }
            nts.forEach(nt => {
                var value = this[nt];
                if (value instanceof Array) {
                    // canonical rule body
                } else {
                    value = [value];
                    this[nt] = value; // make canonical
                }
            });
            nts.forEach(lhs => {
                var rhs = this[lhs];
                if (!rhs) {
                    throw new Error(`Grammar has no rule for:"${lhs}"`);
                }
                var rhs = this[lhs];
                if (!(rhs instanceof Array)) {
                    throw new Error(
                        `${lhs}: rhs must be Array ${rhs}`);
                } 
            });

            // Rewrite grammar for EBNF rules
            nts.forEach(lhs => {
                var rhs = this[lhs];
                for (var i=0; i < rhs.length; i++) {
                    var rhsi = rhs[i];
                    if (rhsi.args instanceof Array) {
                        for (var j=0; j< rhsi.args.length; j++) {
                            if (rhsi.args[j] instanceof Array) {
                                throw new Error(
                                    `${lhs}: Arrays are not allowed `+
                                    `in grammar helpers`);
                            }
                        }
                    }
                    if (/[*?+]/.test(rhsi.ebnf) && rhsi.args.length > 1) {
                        var lhsNew = `${lhs}@${i}`;
                        var rhsNew = rhsi.args;
                        this[lhsNew] = rhsNew;
                        rhsi.args = [ lhsNew ];
                    }
                }
            });
            return this;
        }

    }

    module.exports = exports.Grammar = Grammar;
})(typeof exports === "object" ? exports : (exports = {}));

