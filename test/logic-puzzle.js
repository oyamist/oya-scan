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
    var gridprma = {
      'pr.5': 0, 'pr.6': 0, 'pr.7': 0, 'pr.8': 0, 
      'ma.L': 0, 'ma.N': 0, 'ma.T': 0, 'ma.W': 0
    };
    var gridma = { 
        'ma.L': 0, 'ma.N': 0, 'ma.T': 0, 'ma.W': 0 
    };
    var emptyGrid = {
        'cl.A': gridprma,
        'cl.G': gridprma,
        'cl.F': gridprma,
        'cl.H': gridprma,
        'pr.5': gridma,
        'pr.6': gridma,
        'pr.7': gridma,
        'pr.8': gridma,
    }
    var categories = { cl, pr, ma };

    it("TESTTESTdefault ctor", done=>{
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
    it("TESTTESTcustom ctor", done=>{
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
    it("TESTTESTinitialize() sets up logic grid", done=>{
        (async function(){ try {
            var puzzle = new LogicPuzzle({ logLevel, categories, });
            should(puzzle.catItems).equal(undefined);
            await puzzle.initialize();
            should.deepEqual(puzzle.catItems,[
                'cl.A', 'cl.G', 'cl.F', 'cl.H',
                'pr.5', 'pr.6', 'pr.7', 'pr.8',
                'ma.L', 'ma.N', 'ma.T', 'ma.W',
            ]);
            should.deepEqual(puzzle.grid, emptyGrid);
            done();
        } catch(e) {done(e);} })();
    });
    it("TESTTESTgetBox(...) => grid value", done=>{
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
    it("TESTTESTsetBox(...) => grid value", done=>{
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
    it("TESTTESTsubgrid(...) => subgrid", done=>{
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
    it("TESTTESTvalidate(...) => validates subgrid rows", done=>{
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
    it("TESTTESTvalidate(...) => validates subgrid columns", done=>{
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
    it("TESTTESTinfer(...) => removes boxes", done=>{
        (async function(){ try {
            var puzzle = await new LogicPuzzle({ 
                logLevel, 
                categories, 
            }).initialize();

            should.deepEqual(puzzle.infer(), emptyGrid);

            puzzle.setBox('cl.A', 'pr.5', true);
            puzzle.setBox('cl.A', 'ma.N', false);
            var gridpr5ma = Object.assign({}, gridprma, {'pr.5': false});
            should.deepEqual(puzzle.infer(), 
                Object.assign({}, emptyGrid, {
                'cl.A': Object.assign({}, gridprma, {
                    'pr.5': true,  // setBox
                    'pr.6': false, // inferred
                    'pr.7': false, // inferred
                    'pr.8': false, // inferred
                    'ma.N': false, // setBox
                }),
                'cl.F': gridpr5ma,
                'cl.G': gridpr5ma,
                'cl.H': gridpr5ma,
            }));

            done();
        } catch(e) {done(e);} })();
    });
});
