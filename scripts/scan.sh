#!/usr/bin/node

var {
    Scanner,
} = require('../index');

var scanner = new Scanner();
scanner.transform(process.stdin, process.stdout);
