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
logger.info(`2 ${text}`);
    var canvas = createCanvas(100,40);
    var fname = `barcode-${name}.png`;
    var pngPath = path.join(ASSETS, fname);
    var out = fs.createWriteStream(pngPath);
    var stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () =>  console.log(`Created ${pngPath}`));
    out.on('error', e => logger.error(e.stack));
    JsBarcode(canvas, text);
}

try {
    "0123456789".split('').forEach(d => createBarcode(`  d  `));
    createBarcode('  *  ', 'times');
    createBarcode('  /  ', 'divide');
    createBarcode('  +  ', 'plus');
    createBarcode('  -  ', 'minus');
    createBarcode('  =  ', 'equals');
    createBarcode('  C  ', 'clear');
    createBarcode('  AC  ', 'all_clear');
} catch(e) {
    logger.error(e.stack);
}
