#!/usr/bin/node

const fs = require('fs');
const path = require('path');
const {
    js,
    logger,
} = require('just-simple').JustSimple;
const JsBarcode = require('jsbarcode');
const { Image, createCanvas } = require('canvas');
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
});

function help() {
    console.log(`
NAME
    bcfact - barcode image factory
    
SYNOPSIS
    bcfact [mapfile]

    Generate barcode images for scanner mapfile.

    mapfile 
            Path to scanner mapfile with a JSON object whose keys are 
            the mapped barcodes and whose values are Javascript 
            objects with replacement values for: "tag" and "value".
            Default is "test/data/calc-map.json"

OPTIONS
    -h, --help
            Print command line options

    -p, --prefix PREFIX
            File name prefix. Default is "calc"

    -o, --outdir OUTDIR
            Path to folder for barcode images. Default is current.


`);
    process.exit(0);
}

var prefix = "calc";
var mpath = path.join(__dirname, '..', 'test', 'data', 'calc-map.json');
var outdir = path.join(__dirname, '..', 'src', 'assets');

for (var i=2; i<process.argv.length; i++) {
    var arg = process.argv[i];
    if (arg === '-h' || arg === '--help') {
        help();
    } else if (arg === '-p' || arg === '--prefix') {
        prefix = process.argv[++i];
    } else if (arg === '-o' || arg === '--outdir') {
        outdir = process.argv[++i];
    } else if (arg.startsWith('-')) {
        help();
    } else {
        mpath = arg;
    }
}

logger.info(`Scanner map file:     ${mpath}`);
logger.info(`Barcode image prefix: "${prefix}"`);
logger.info(`Output directory:     ${outdir}`);

if (!fs.existsSync(mpath)) {
    throw new Error(`Map file not found: ${mpath}`);
}

if (!fs.existsSync(outdir)) {
    throw new Error(`Output directory not found:${outdir}`);
}

function createBarcode(text, name=text.trim()) {
    var canvas = createCanvas(100,40);
    var fname = `${prefix}-${name}.png`;
    var pngPath = path.join(outdir, fname);
    var out = fs.createWriteStream(pngPath);
    var stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () =>  logger.info(`Created ${pngPath}`));
    out.on('error', e => logger.error(e.stack));
    JsBarcode(canvas, text, {
        height: 35,
    });
}

var map = JSON.parse(fs.readFileSync(mpath));
function execute() {
    var keys = Object.keys(map);
    logger.info(`Creating ${keys.length} barcode images...`);
    keys.forEach(k => {
        var label = map[k].tag;
        if (label === 'digit') {
            label = map[k].value;
        }
        createBarcode(k, label);
    });
}

readline.question(`Create barcode files? (Y/n)`, yn => {
    if (yn.toLowerCase().trim() === 'y' || yn.trim() === '') {
        execute();
    }
    readline.close();
});

