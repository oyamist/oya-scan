#!/usr/bin/node

const fs = require('fs');
const path = require('path');
const {
    js,
    logger,
} = require('just-simple').JustSimple;
const JsBarcode = require('jsbarcode');
const { Image, createCanvas } = require('canvas');
const {
    Scanner,
    Calculator,
} = require('../index');
const Stream = require('stream');

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

    -m, --map MAPFILE
            Reads given Scanner MAPFILE for JSON object whose keys are 
            the mapped barcodes and whose values are Javascript 
            objects with replacement values for: "tag" and "value".
            Default is "test/data/calc-map.json"

`);
    process.exit(0);
}

var mpath = null;
var map = {};
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
    } else if (arg === '-m' || arg === '--map') {
        mpath = process.argv[++i];
        if (!fs.existsSync(mpath)) {
            throw new Error(`Map file not found:${mpath}`);
        }
        map = JSON.parse(fs.readFileSync(mpath));
        logLevel && logger[logLevel](`loaded scan map from:${mpath}`);
    } else if (arg.startsWith('-')) {
        help();
    }

}

var scanner = new Scanner({
    map,
    logLevel,
});
var calc = new Calculator({
    logLevel,
});

var sos = new Stream.PassThrough();
//var pscan = scanner.transform(process.stdin, sos);
var cis = process.stdin;
var pcalc = calc.transform(cis, process.stdout);

pcalc.then(r => {
    r.argv = process.argv;
    console.error(JSON.stringify(r, null, 2));
});

