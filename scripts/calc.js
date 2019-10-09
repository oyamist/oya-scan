#!/usr/bin/node

const fs = require('fs');
const path = require('path');
const {
    js,
    logger,
} = require('just-simple').JustSimple;
const JsBarcode = require('jsbarcode');
const { Image, createCanvas } = require('canvas');

logger.info('1');
const ASSETS = path.join(__dirname, '..', 'src', 'assets');

function createBarcode(text, name=text.trim()) {
    var canvas = createCanvas(100,40);
    var fname = `calc-${name}.png`;
    var pngPath = path.join(ASSETS, fname);
    var out = fs.createWriteStream(pngPath);
    var stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () =>  console.log(`Created ${pngPath}`));
    out.on('error', e => logger.error(e.stack));
    JsBarcode(canvas, text, {
        height: 35,
    });
}

var calcMapPath = path.join(__dirname, '..', 'test', 'data', 'calc-map.json');
var calcMap = JSON.parse(fs.readFileSync(calcMapPath));
Object.keys(calcMap).forEach(k => {
    var label = calcMap[k].tag;
    if (label === 'digit') {
        label = calcMap[k].value;
    }
    createBarcode(k, label);
});

function help() {
    console.log(`
NAME
    calc - transform barcode scanner input to observations
    
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

