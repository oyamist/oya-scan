#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
    js,
    logger,
} = require('just-simple').JustSimple;
const JsBarcode = require('jsbarcode');
const { Image, createCanvas } = require('canvas');
const {
    Calculator,
    GrammarFactory,
    Pipeline,
    Scanner,
} = require('../index');
const {
    PassThrough,
    Readable,
    Writable,
} = require('stream');

function help() {
    console.log(`
NAME
    calc - transform barcode scanner input to observations
    
SYNOPSIS
    calc OPTIONS

    Transforms input lines from barcode scanner to JSON timestamped 
    observations, mapping designated barcodes according to map file.

OPTIONS
    -h, --help
            Print command line options

    -ll, --logLevel LOGLEVEL
            Winston logging level(false): debug, info, warn, error

    -iss
            Use stdin as Scanner input (default)
            
    -iso
            Use stdin as Observation stream
            
    -m, --map MAPFILE
            Reads given Scanner MAPFILE for JSON object whose keys are 
            the mapped barcodes and whose values are Javascript 
            objects with replacement values for: "tag" and "value".
            Default is "test/data/calc-map.json"

`);
    process.exit(0);
}

var iss = true;
var mpath = path.join(__dirname, '..', 'test', 'data', 'calc-map.json');
var patterns = [];
var logLevel = false;
for (var i=0; i<process.argv.length; i++) {
    var arg = process.argv[i];
    if (arg === '-h' || arg === '--help') {
        help();
    } else if (arg === '-ll' || arg === '--logLevel') {
        logLevel = process.argv[++i];
        logLevel = logLevel === 'false' ? false : logLevel;
        logLevel && logger[logLevel](`logLevel: ${logLevel}`);
    } else if (arg === '-iss') {
        iss = true;
    } else if (arg === '-iso') {
        iss = false;
    } else if (arg === '-m' || arg === '--map') {
        mpath = process.argv[++i];
    } else if (arg.startsWith('-')) {
        help();
    }

}

var gf = new GrammarFactory(GrammarFactory.OPTS_TERSE);
var calc = new Calculator({
    grammarFactory: gf,
    logLevel,
});

if (0) {
if (iss) {
    if (!fs.existsSync(mpath)) {
        throw new Error(`Map file not found:${mpath}`);
    }
    var map = JSON.parse(fs.readFileSync(mpath));
    logLevel && logger[logLevel](`loaded scan map from:${mpath}`);
    var scanner = new Scanner({
        map,
        logLevel,
    });
    var calcInput = new PassThrough();
    var pscan = scanner.transformLegacy(process.stdin, calcInput);
} else {
    var calcInput = process.stdin;
} 
var pcalc = calc.transform(calcInput, process.stdout);
pcalc.then(r => {
    r.argv = process.argv;
    console.error(JSON.stringify(r, null, 2));
});
} else {
(async function() { try {
    console.log(`dbg stdin`, process.stdin instanceof Readable);
    if (!fs.existsSync(mpath)) {
        throw new Error(`Map file not found:${mpath}`);
    }
    var map = JSON.parse(fs.readFileSync(mpath));
    logLevel && logger[logLevel](`loaded scan map from:${mpath}`);
    var scanner = new Scanner({
        map,
        logLevel,
    });
    var {
        inputPromise,
    } = await new Pipeline({ logLevel, }).build(
        process.stdin,
        scanner,
        calc,
        Pipeline.Format('${tag}:${value} ${type}',process.stdout)
    );
    var res = await inputPromise;
    console.log(`dbg res`, res);
} catch(e) {
    logger.error(e.stack);
    process.exit(-1);
}})();

}


