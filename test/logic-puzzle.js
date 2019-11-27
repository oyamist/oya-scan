(typeof describe === 'function') && describe("logic-puzzle", function() {
    const should = require("should");
    const { js, logger } = require('just-simple').JustSimple;
    const {
        Aggregator,
        Observation,
        Pipeline,
        Source,
        Sink,
        LogicPuzzle,
    } = require('../index');
    var logLevel = false;

    // http://www.emnlp2015.org/proceedings/EMNLP/pdf/EMNLP118.pdf
    var cl = [ "A", "G", "F", "H" ]; // clients
    var pr = [ 5, 6, 7, 8 ]; // prices
    var ma = [ "L", "N", "T", "W" ]; // masseuses
    var gridmapr = {
      'ma.L': 0, 'ma.N': 0, 'ma.T': 0, 'ma.W': 0,
      'pr.5': 0, 'pr.6': 0, 'pr.7': 0, 'pr.8': 0, 
    };
    var gridma = {'ma.L': 0, 'ma.N': 0, 'ma.T': 0, 'ma.W': 0, };
    var gridpr = {'pr.5':0, 'pr.6':0, 'pr.7':0, 'pr.8':0,};

    var emptyGrid = {
        'cl.A': gridmapr,
        'cl.G': gridmapr,
        'cl.F': gridmapr,
        'cl.H': gridmapr,
        'ma.L': gridpr,
        'ma.N': gridpr,
        'ma.T': gridpr,
        'ma.W': gridpr,
    }
    var categories = { cl, ma, pr, };

    it("default ctor", done=>{
        (async function(){ try {
            var puzzle = new LogicPuzzle();
            should(puzzle).properties({
                categories: {},
                logLevel: 'info',
                initialized: false,
                isValid: true,
            });
            done();
        } catch(e) {done(e);} })();
    });
    it("custom ctor", done=>{
        (async function(){ try {
            var puzzle = new LogicPuzzle({ logLevel, categories, });
            should(puzzle).properties({ 
                logLevel, 
                categories, 
                initialized: false,
                isValid: true,
            });
            done();
        } catch(e) {done(e);} })();
    });
    it("initialize() sets up logic grid", done=>{
        (async function(){ try {
            var puzzle = new LogicPuzzle({ logLevel, categories, });
            should(puzzle.catItems).equal(undefined);
            await puzzle.initialize();
            should.deepEqual(puzzle.catItems,[
                'cl.A', 'cl.G', 'cl.F', 'cl.H',
                'ma.L', 'ma.N', 'ma.T', 'ma.W',
                'pr.5', 'pr.6', 'pr.7', 'pr.8',
            ]);
            should.deepEqual(puzzle.grid, emptyGrid);
            done();
        } catch(e) {done(e);} })();
    });
    it("getBox(...) => grid value", done=>{
        (async function(){ try {
            var puzzle = await new LogicPuzzle({ 
                logLevel, 
                categories, 
            }).initialize();

            // Item order is irrelevant
            should(puzzle.getBox('cl.A', 'pr.5')).equal(0);
            should(puzzle.getBox('pr.5', 'cl.A')).equal(0);
            done();
        } catch(e) {done(e);} })();
    });
    it("setBox(...) => grid value", done=>{
        (async function(){ try {
            var puzzle = await new LogicPuzzle({ 
                logLevel, 
                categories, 
            }).initialize();

            var value = true;
            puzzle.setBox('cl.A', 'pr.5', value);
            should(puzzle.getBox('pr.5', 'cl.A')).equal(value);
            should(puzzle.getBox('cl.A', 'pr.5')).equal(value);
            should(puzzle.isValid).equal(true);

            // Item order is irrelevant
            puzzle.setBox('pr.5', 'cl.A', false);
            should(puzzle.getBox('pr.5', 'cl.A')).equal(false);
            should(puzzle.getBox('cl.A', 'pr.5')).equal(false);
            should(puzzle.isValid).equal(true);
            done();
        } catch(e) {done(e);} })();
    });
    it("subgrid(...) => subgrid", done=>{
        (async function(){ try {
            var puzzle = await new LogicPuzzle({logLevel, categories})
                .initialize();

            puzzle.setBox('cl.A', 'pr.5', true);
            should.deepEqual(puzzle.subgrid('cl.A','pr.5'),
                puzzle.subgrid('pr.5','cl.A'));
            should.deepEqual(puzzle.subgrid('cl.A','pr.5'), {
                'cl.A': { 'pr.5': true, 'pr.6': 0, 'pr.7': 0, 'pr.8': 0},
                'cl.F': { 'pr.5': 0, 'pr.6': 0, 'pr.7': 0, 'pr.8': 0},
                'cl.G': { 'pr.5': 0, 'pr.6': 0, 'pr.7': 0, 'pr.8': 0},
                'cl.H': { 'pr.5': 0, 'pr.6': 0, 'pr.7': 0, 'pr.8': 0},
            });
            done();
        } catch(e) {done(e);} })();
    });
    it("validate(...) => validates subgrid rows", done=>{
        (async function(){ try {
            var puzzle = await new LogicPuzzle({ 
                logLevel, 
                categories, 
            }).initialize();

            puzzle.setBox('cl.A', 'pr.5', true);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));

            // create row multiple match
            var eCaught = null;
            try {
                puzzle.setBox('cl.A', 'pr.7', true);
                puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            } catch(e) {
                eCaught = e;
            }
            should(eCaught).instanceOf(Error);

            // revert invalid entry
            puzzle.setBox('cl.A', 'pr.7', 0);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            puzzle.setBox('cl.A', 'pr.5', 0);
            should.deepEqual(puzzle.grid, emptyGrid);

            // create non-match
            puzzle.setBox('cl.A', 'pr.5', false);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            puzzle.setBox('cl.A', 'pr.6', false);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            puzzle.setBox('cl.A', 'pr.7', false);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            var eCaught = null;
            try {
                puzzle.setBox('cl.A', 'pr.8', false);
                puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            } catch(e) {
                eCaught = e;
            }
            should(eCaught).instanceOf(Error);

            // revert an invalid entry
            puzzle.setBox('cl.A', 'pr.8', 0);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));

            done();
        } catch(e) {done(e);} })();
    });
    it("validate(...) => validates subgrid columns", done=>{
        (async function(){ try {
            var puzzle = await new LogicPuzzle({ 
                logLevel, 
                categories, 
            }).initialize();

            puzzle.setBox('cl.A', 'pr.5', true);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));

            // create row multiple match
            try {
                var eCaught = null;
                puzzle.setBox('cl.F', 'pr.5', true);
                var m = puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            } catch(e) { eCaught = e; }
            should(eCaught).instanceOf(Error);

            // revert entries
            puzzle.setBox('cl.F', 'pr.5', 0);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            puzzle.setBox('cl.A', 'pr.5', 0);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            should.deepEqual(puzzle.grid, emptyGrid);

            // create non-match
            puzzle.setBox('cl.A', 'pr.5', false);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            puzzle.setBox('cl.G', 'pr.5', false);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            puzzle.setBox('cl.F', 'pr.5', false);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            try {
                var eCaught = null;
                puzzle.setBox('cl.H', 'pr.5', false);
                puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));
            } catch(e) { eCaught = e; }
            should(eCaught).instanceOf(Error);

            // revert an invalid entry
            puzzle.setBox('cl.A', 'pr.5', 0);
            puzzle.validate(puzzle.subgrid('cl.A', 'pr.5'));

            done();
        } catch(e) {done(e);} })();
    });
    it("infer(...) => updates boxes", done=>{
        (async function(){ try {
            var puzzle = await new LogicPuzzle({ 
                logLevel, 
                categories, 
            }).initialize();

            should.deepEqual(puzzle.infer(), emptyGrid);

            puzzle.setBox('cl.G', 'ma.T', true);
            puzzle.setBox('cl.G', 'pr.5', false);
            var gridmaTpr = Object.assign({}, gridmapr, {'ma.T': false});
            should.deepEqual(puzzle.infer(), 
                Object.assign({}, emptyGrid, {
                'cl.A': gridmaTpr,
                'cl.F': gridmaTpr,
                'cl.G': Object.assign({}, gridmapr, {
                    'pr.5': false,  // setBox
                    'ma.L': false, // inferred
                    'ma.N': false, // inferred
                    'ma.T': true, // setBox
                    'ma.W': false, // inferred
                }),
                'cl.H': gridmaTpr,
            }));
            console.log(`dbg infer`, puzzle.toString());

            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTundo() => restores prior state", done=>{
        (async function(){ try {
            var puzzle = await new LogicPuzzle({ 
                logLevel: 'info', 
                categories, 
            }).initialize();

            // error handling
            should.throws(() => puzzle.undo());

            // undo setBox()
            puzzle.setBox('cl.G', 'ma.T', true);
            puzzle.undo();
            should.deepEqual(puzzle.grid, emptyGrid);

            // undo infer()
            puzzle.setBox('cl.G', 'ma.T', true);
            var oldPuzzle = JSON.parse(JSON.stringify(puzzle, null, 2));
            puzzle.infer();
            puzzle.undo();
            should.deepEqual(JSON.parse(JSON.stringify(puzzle)), 
                oldPuzzle);

            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTemptyBoxes() => # empty boxes", done=>{
        (async function(){ try {
            var puzzle = await new LogicPuzzle({ 
                logLevel: 'info', 
                categories, 
            }).initialize();

            should(puzzle.emptyBoxes()).equal(48);
            puzzle.setBox('cl.F', 'ma.T', true);
            should(puzzle.emptyBoxes()).equal(47);
            puzzle.infer();
            should(puzzle.emptyBoxes()).equal(41);

            done();
        } catch(e) {done(e);} })();
    });
});
