(typeof describe === 'function') && describe("Workspace", function() {
    const fs = require('fs');
    const path = require('path');
    const winston = require('winston');
    const should = require("should");
    const tmp = require("tmp");
    const {
        Thing,
        Workspace,
        Observation,
        Scanner,
    } = require("../index");

    var storeDir = tmp.tmpNameSync();
    var wstest = new Workspace({
        storeDir,
    });
    console.log(`test scanning storeDir:`, storeDir);

    it("default ctor", ()=>{
        var ws = new Workspace();
        should(ws).instanceOf(Workspace);
        should(ws).properties({
            type: 'Workspace',
            storeName: 'workspace',
        });
        should(ws.scanner).instanceOf(Scanner);
    });
    it("scanning new barcode creates new Thing", ()=>{
        var ws = wstest;
        var scanner = ws.scanner;

        // new barcode creates new Thing
        var barcode = "A0001";
        var ob1 = scanner.scan(barcode);
        should(ob1.tag).equal("Thing");
        should(ob1.value).match(/([0-9a-f]+-){4,4}[0-9a-f]+/);

        // re-scanning barcode returns guid of same thing
        var ob2 = scanner.scan(barcode);
        should(ob2.tag).equal(ob1.tag);
        should(ob2.value).equal(ob1.value);

        var guid = ob1.value;
        var thing = ws.thingOfGuid(guid);
        should(thing).properties({
            type: "Thing",
            guid,
            barcode,
        })
    });
    it("scan number", ()=>{
        var {
            scanner,
        } = wstest;

        var ob1 = scanner.scan("1");
        should(ob1).properties({
            tag: 'number',
            value: 1,
        });

        var ob1 = scanner.scan("42");
        should(ob1).properties({
            tag: 'number',
            value: 42,
        });

    });

})
