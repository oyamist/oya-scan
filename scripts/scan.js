#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
    js,
    logger,
} = require('just-simple').JustSimple;

var {
    Scanner,
} = require('../index');

function help() {
    console.log(`
NAME
    scan - transform barcode scanner input to observations
    
SYNOPSIS
    scan [-m mapfile] 

    Transforms input lines from barcode scanner to JSON timestamped 
    observations, mapping designated barcodes according to map file.

OPTIONS
    -h, --help
            Print command line options

    -m, --map mapfile
            Reads given mapfile file for JSON object whose keys are 
            the mapped barcodes and whose values are Javascript 
            objects with replacement values for: "tag" and "value".

    -n, --number
            Match numbers with up to 7 digits of precision
            as Observations with "number" tag.

    --ean13
            Match thirteen digits as Observations with "EAN13" tag.

    --upca
            Match twelve digits as Observations with "UPCA-A" tag.

    --upce_ean8
            Match eight digits as Observations with "UPC-E/EAN-8" tag

`);
    process.exit(0);
}

var mpath = null;
var map = {};
var patterns = [];
for (var i=0; i<process.argv.length; i++) {
    var arg = process.argv[i];
    if (arg === '-h' || arg === '--help') {
        help();
    } else if (arg === '-n' || arg === '--number') {
        patterns.push(Scanner.MATCH_NUMBER);
    } else if (arg === '--ean13') {
        patterns.push(Scanner.MATCH_EAN13);
    } else if (arg === '--upca') {
        patterns.push(Scanner.MATCH_UPCA);
    } else if (arg === '--upce_ean8') {
        patterns.push(Scanner.MATCH_UPCE_EAN8);
    } else if (arg === '-m' || arg === '--map') {
        mpath = process.argv[++i];
        if (!fs.existsSync(mpath)) {
            throw new Error(`Map file not found:${mpath}`);
        }
        map = JSON.parse(fs.readFileSync(mpath).toString());
        logger.info(`loaded scan map from:${mpath}`);
    } else if (arg.startsWith('-')) {
        help();
    }

}

var scanner = new Scanner({
    map,
    patterns,
});
var promise = scanner.transformLegacy(process.stdin, process.stdout);

promise.then(r => {
    r.argv = process.argv;
    console.error(JSON.stringify(r, null, 2));
});
