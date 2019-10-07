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
