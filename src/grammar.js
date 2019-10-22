(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const { logger } = require('just-simple').JustSimple;
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
            if (g instanceof Grammar) {
                this.rhsMap = JSON.parse(JSON.stringify(g.rhsMap));
            } else {
                this.rhsMap = JSON.parse(JSON.stringify(g));
            }
            this.firstMap = {};
            this.validate();
        }

        static get STAR() { return STAR; } // Grammar helper zero or more
        static get PLUS() { return PLUS; } // Grammar helper one or more
        static get ALT() { return ALT; } // Grammar helper alternation
        static get OPT() { return OPT; } // Grammar helper zero or one

        rhs(lhs) {
            return this.rhsMap[lhs];
        }

        addRule(lhs, rhs) {
            this.rhsMap[lhs] = rhs;
        }

        get nonterminals() {
            return Object.keys(this.rhsMap);
        }

        validate(g=this) {
            var nts = g.nonterminals.sort();
            if (nts.length === 0) {
                throw new Error(`Grammar has no rules`);
            }
            if (!g.rhsMap.hasOwnProperty('root')) {
                throw new Error(`Expected rule for "root"`);
            }
            nts.forEach(nt => {
                var value = g.rhs(nt);
                if (value instanceof Array) {
                    // canonical rule body
                } else {
                    value = [value];
                    g.addRule(nt, value);
                }
            });
            nts.forEach(lhs => {
                var rhs = g.rhs(lhs);
                if (!rhs) {
                    throw new Error(`Grammar has no rule for:"${lhs}"`);
                }
                var rhs = g.rhs(lhs);
                if (!(rhs instanceof Array)) {
                    throw new Error(
                        `${lhs}: rhs must be Array ${rhs}`);
                } 
            });

            // Rewrite grammar for EBNF rules
            nts.forEach(lhs => {
                var rhs = g.rhs(lhs);
                for (var i=0; i < rhs.length; i++) {
                    var rhsi = rhs[i];
                    if (!rhsi) {
                        throw new Error(`Invalid rule ${lhs} ${rhs}`);
                    }
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
                        g.addRule(lhsNew, rhsNew);
                        rhsi.args = [ lhsNew ];
                    }
                }
            });
            return g;
        }

        ruleToString(lhs, rhs=this.rhs(lhs)) {
            var s = rhs.reduce((a,r) => {
                switch (r.ebnf) {
                    case '*':
                        return `${a} STAR( ${r.args} )`;
                    case '?':
                        return `${a} OPT( ${r.args} )`;
                    case '+':
                        return `${a} PLUS( ${r.args} )`;
                    case '|':
                        return `${a} ALT( ${r.args.join(' | ')} )`;
                    default:
                        return `${a} ${r}`;
                }
            }, `${lhs} ::=`);
            return s;
        }

        toString(prefix='  ') {
            return this.nonterminals
                .sort()
                .map(lhs => prefix+this.ruleToString(lhs))
                .join('\n');
        }

        first(sym) {
            var {
                firstMap,
                rhsMap,
            } = this;
            var f = firstMap[sym];
            if (f) {
                return f;
            }

            var symTerm = !rhsMap.hasOwnProperty(sym);

            if (symTerm) {
                return (firstMap[sym] = {[sym]:true});
            }

            // sym in nonterminal
            var rhs = this.rhs(sym);
            firstMap[sym] = f = {};
            var ebnf = rhs[0].ebnf;
            if (!ebnf) {
                firstMap[sym] = Object.assign(f, this.first(rhs[0]));
                return f;
            }

            for (var i = 0; i < rhs.length; i++) {
                var {
                    ebnf,
                    args,
                } = rhs[i];
                if (ebnf == null) {
                    Object.assign(f, this.first(rhs[i]));
                    break;
                } else if (ebnf === '?') {
                    Object.assign(f, this.first(args[0]));
                } else if (ebnf === '*') {
                    Object.assign(f, this.first(args[0]));
                } else if (ebnf === '|') {
                    for (var j = 0; j < args.length; j++) {
                        var arg = args[j];
                        Object.assign(f, this.first(arg));
                    }
                    break;
                } else if (ebnf === '+') {
                    Object.assign(f, this.first(args[0]));
                    break;
                } else {
                    f = this.first(rhs[i]);
                    break;
                }
            }
            return f;
        }

        isFirst(sym, lhs) {
            var f = this.first(lhs);
            return f && f[sym] === true;
        }

    }

    module.exports = exports.Grammar = Grammar;
})(typeof exports === "object" ? exports : (exports = {}));

