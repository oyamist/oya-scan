(function(exports) {
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;
    const Observer = require('./observer');

    class LogicPuzzle extends Observer {
        constructor(opts) {
            super((opts = LogicPuzzle.options(opts)));
            this.categories = opts.categories;
            this.isValid = true;
            Object.defineProperty(this, 'undoStack', {
                value: [],
            });
        }

        static options(opts={}) {
            return Object.assign({
                categories: {},
            }, opts, {
            });
        }

        static factorial(n) {
            return n > 1 ? n * LogicPuzzle.factorial(n-1) : 1;
        }

        onInitialize(resolve, reject) {
            var rowCats = Object.keys(this.categories);
            var colCats = rowCats.slice();
            var catItems = this.catItems = rowCats.reduce((a,c) => {
                return a.concat(this.categories[c].map(ci=>`${c}.${ci}`));
            }, []);
            var rowItems = catItems.slice();
            this.grid = rowCats.reduce((aCol,c) => {
                rowItems = rowItems.filter(ri=>ri.indexOf(c)!==0);
                if (!rowItems.length) { return aCol; }
                catItems.forEach(ci => { if (ci.startsWith(c)) {
                    var row = rowItems.reduce((aRow,ri)=> {
                        if (ri.indexOf(c) !== 0 ) {
                            aRow[ri] = 0;
                        }
                        return aRow;
                    },{});
                    aCol[ci] = row;
                }});
                return aCol;
            }, {});
            this.rowKeys = Object.keys(this.grid).sort();
            this.initialized = true;
            resolve(this);
        }

        getBox(item1, item2) {
            var row1 = this.grid[item1];
            if (row1 && row1[item2]!=null) {
                return row1[item2];
            }
            var row2 = this.grid[item2];
            if (row2) { return row2[item1] }
            return undefined;
        }

        setBox(item1, item2, value) {
            var {
                grid,
                undoStack,
            } = this;
            var row1 = grid[item1];
            if (row1 && row1[item2] != null) {
                var oldValue = row1[item2];
                undoStack.push(() => { 
                    this.log(`undo: setBox(${item1},${item2},${oldValue})`);
                    row1[item2] = oldValue; 
                });
                row1[item2] = value;
                return;
            } 
            var row2 = grid[item2];
            if (row2 && row2[item1] != null) {
                var oldValue = row2[item1];
                undoStack.push(() => { 
                    this.log(`undo: setBox(${item1},${item2},${oldValue})`);
                    row2[item1] = oldValue; 
                });
                row2[item1] = value;
                return;
            }
            throw new Error(row1 == null
                ? `Invalid item:${item1}`
                : `Invalid item:${item2}`);
        }

        subgrid(item1, item2) {
            var {
                grid,
                categories,
            } = this;
            var row = grid[item1];
            if (!row || row[item2]==null) {
                [item1,item2] = [item2, item1];
                row = grid[item1];
                if (!row || row[item2]==null)  {
                    throw new Error(`Invalid subgrid:${c1} ${c2}`);
                }
            }
            var cats = Object.keys(categories);
            var c1 = item1.split('.')[0];
            var c2 = item2.split('.')[0];
            return Object.keys(grid).reduce((ar,kr) => {
                if (kr.startsWith(c1)) {
                    var gkr = grid[kr];
                    ar[kr] = Object.keys(gkr).reduce((ac,kc) => {
                        if (kc.startsWith(c2)) {
                            ac[kc] = gkr[kc];
                        }
                        return ac;
                    },{});
                }
                return ar;
            },{});
        }

        validate(subgrid) {
            var rowKeys = Object.keys(subgrid);
            var error = null;
            var matches = rowKeys.reduce((m,kr) => {
                var row = subgrid[kr];
                var cr = kr.split('.')[0];
                var colKeys = Object.keys(row);
                m[kr] = colKeys.reduce((ac, kc) => {
                    var value = row[kc];

                    var mkc = m[kc] = m[kc] || {};
                    mkc[cr] = mkc[cr] || {};
                    mkc[cr][value] = (mkc[cr][value] || 0) + 1;
                    if (value === true && mkc[cr][value] > 1) {
                        throw new Error(`${kc} must match exactly one `+
                            `item in category: ${kr}`);
                    }
                    if (value === false && mkc[cr][value]===colKeys.length){
                        throw new Error(
                            `No matches for ${kc} in category ${cr}`);
                    }

                    var cc = kc.split('.')[0];
                    ac[cc] = ac[cc] || {};
                    ac[cc][value] = (ac[cc][value] || 0) + 1;
                    if (value === true && ac[cc][value] > 1) {
                        throw new Error(`${kr} must match exactly one `+
                            `item in category: ${js.simpleString(row)}`);
                    }
                    if (value === false && ac[cc][value]===colKeys.length){
                        throw new Error(
                            `No matches for ${kr}:${js.simpleString(row)}`);
                    }
                    return ac;
                }, {});

                return m;
            }, {});
            return matches;
        }

        toString(grid=this.grid) {
            return Object.keys(grid).reduce((a,k) => {
                a += `${k} => ${js.simpleString(grid[k])}\n`;
                return a;
            },'');
        }

        infer() {
            var that = this;
            var {
                grid,
                rowKeys,
                undoStack,
            } = this;
            var colRowCat = rowKeys.reduce((crc,kr) => {
                let krc = kr.split('.')[0];
                crc[krc] = crc[krc] || {};
                let row = grid[kr];
                Object.keys(row).forEach(kc => {
                    (row[kc] === true) && (crc[krc][kc] = true);
                }, {});
                return crc;
            }, {});
            var g = rowKeys.reduce((g,kr) => {
                let krc = kr.split('.')[0];
                let crckrc = colRowCat[krc];
                let row = grid[kr];
                let colKeys = Object.keys(row);
                let colCats = colKeys.reduce((cc,kc) => {
                    var kcc = kc.split('.')[0];
                    (row[kc] === true) && (cc[kcc] = true);
                    return cc;
                },{});
                g[kr] = colKeys.reduce((r,kc) => {
                    var kcc = kc.split('.')[0];
                    r[kc] = colCats[kcc]
                        ? (row[kc] === true)
                        : (crckrc[kc] ? false : row[kc]);
                    return r;
                },{});
                return g;
            }, {});
            undoStack.push(() => { 
                this.log(`undo: reverting infer()`);
                that.grid = grid; 
            });
            this.grid = g;
            return g;
        }

        undo() {
            var {
                undoStack,
            } = this;
            if (undoStack.length <= 0) {
                throw new Error(`Nothing to undo()`);
            }
            var tos = undoStack.pop();
            tos();
        }

        emptyBoxes() {
            var {
                grid,
                rowKeys,
            } = this;
            var nBoxes = 0;
            return rowKeys.reduce((a,kr) => {
                var row = grid[kr];
                return Object.keys(row).reduce((a,kc) => {
                    return row[kc] === 0 ? a+1 : a;
                }, a);
            }, 0);
        }

        solutions() {
            var {
                grid,
                rowKeys,
            } = this;
            var nBoxes = 0;
            var state = {};
            var keys = Object.keys(state).sort();
            var cursor = keys.map(k=>0);
            var next = () => {
                let newCursor = [];
                let solution = [];
                return solution;
            }
            return {next, cursor, keys, state, };
        }

    }

    module.exports = exports.LogicPuzzle = LogicPuzzle;
})(typeof exports === "object" ? exports : (exports = {}));

