#!/usr/bin/node

const fs = require('fs');
const path = require('path');
const JsBarcode = require('jsbarcode');
const { Image, createCanvas } = require('canvas');

const ASSETS = path.join(__dirname, '..', 'src', 'assets');

function createBarcode(text) {
    var canvas = createCanvas();
    var pngPath = path.join(ASSETS, `barcode-${text}.png`);
    var out = fs.createWriteStream(pngPath);
    var stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () =>  console.log(`Created ${pngPath}`));
    JsBarcode(canvas, text);
}

"0123456789".split('').forEach(d => createBarcode(`D${d}`));
[
    'times',
    'divide',
    'plus',
    'minus',
    'equals',
    'clear',
    'all_clear',
].forEach(op => createBarcode(`${op}`));

