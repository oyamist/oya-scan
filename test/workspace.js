(typeof describe === 'function') && describe("Workspace", function() {
    const winston = require('winston');
    const should = require("should");
    const {
        Asset,
        Workspace,
        Observation,
        Scanner,
    } = require("../index");

    it("default ctor", ()=>{
        var ws = new Workspace();
        should(ws).instanceOf(Workspace);
        should(ws).properties({
            type: 'Workspace',
            storeName: 'workspace',
        });
    });
})
