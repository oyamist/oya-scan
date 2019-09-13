#!/usr/bin/node

const fs = require('fs');
const path = require('path');

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

`);
    process.exit(0);
}

var mpath = null;
var map = {};
for (var i=0; i<process.argv.length; i++) {
    var arg = process.argv[i];
    if (arg === '-h' || arg === '--help') {
        help();
    } else if (arg === '-m' || arg === '--map') {
        mpath = process.argv[++i];
        if (!fs.existsSync(mpath)) {
            throw new Error(`Map file not found:${mpath}`);
        }
        map = JSON.parse(fs.readFileSync(mpath).toString());
    } else if (arg.startsWith('-')) {
        help();
    }

}

var scanner = new Scanner({
    map,
});
var promise = scanner.transform(process.stdin, process.stdout);

promise.then(r => {
    r.argv = process.argv;
    console.error(JSON.stringify(r, null, 2));
});
