(typeof describe === 'function') && describe("Workspace", function() {
    const fs = require('fs');
    const path = require('path');
    const winston = require('winston');
    const should = require("should");
    const tmp = require("tmp");
    const {
        Asset,
        Workspace,
        Observation,
        Scanner,
    } = require("../index");

    it("TESTTESTdefault ctor", ()=>{
        var ws = new Workspace();
        should(ws).instanceOf(Workspace);
        should(ws).properties({
            type: 'Workspace',
            storeName: 'workspace',
        });
        should(ws.scanner).instanceOf(Scanner);
    });
    it("TESTTESTscanning new barcode creates new Asset", ()=>{
        var storeDir = tmp.tmpNameSync();
        var ws = new Workspace({
            storeDir,
        });
        console.log(`test scanning storeDir:`, storeDir);
        var scanner = ws.scanner;

        // new barcode creates new Asset
        var barcode = "A0001";
        var ob1 = scanner.scan(barcode);
        should(ob1.tag).equal("Asset");
        should(ob1.value).match(/[0-9a-f]*-[0-9a-f]*-[0-9a-f]*-[0-9a-f]*-[0-9a-f]*/);

        // re-scanning barcode returns guid of same asset
        var ob2 = scanner.scan(barcode);
        should(ob2.tag).equal(ob1.tag);
        should(ob2.value).equal(ob1.value);

        var guid = ob1.value;
        var asset = ws.assetOfGuid(guid);
        should(asset).properties({
            type: "Asset",
            guid,
            barcode,
        })
    });
})
