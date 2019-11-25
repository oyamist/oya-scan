(typeof describe === 'function') && describe("guid-store", function() {
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const { MerkleJson } = require("merkle-json");
    const tmp = require('tmp');
    const {
        GuidStore,
    } = require("../index");
    const local = path.join(__dirname, '..', 'local');
    var mj = new MerkleJson();

    it("default and custom ctor", () => {
        var store = new GuidStore();
        should(store.storeDir).equal(local);
        should(store.storePath).equal(path.join(local, 'guid-store'));
        should(fs.existsSync(store.storePath)).equal(true);

        var storeDir = tmp.tmpNameSync();
        var store = new GuidStore({
            type: 'TestStore',
            name: 'a-test-store',
            storeDir,
        });
        should(store.storeDir).equal(storeDir);
        should(store.storePath).equal(path.join(storeDir, 'a-test-store'));
        should(store.volume).equal('common');
        should(fs.existsSync(store.storePath)).equal(true);
    });
    it("derived class default ctor", () => {
        class TestStore extends GuidStore {};
        var storeDir = tmp.tmpNameSync();
        var store = new TestStore({
            storeDir,
        });
        should(store.storePath).equal(path.join(storeDir, 'test-store'));
        should(fs.existsSync(store.storePath)).equal(true);
    });
    it("guidPath(guid) returns file path of guid", function() {
        var store = new GuidStore();
        var guid = mj.hash("hello world");
        var guidDir = guid.substring(0,2);
        var commonPath = path.join(local, 'guid-store', 'common', guidDir);
        var dirPath = path.join(commonPath, guid);
        should(store.guidPath(guid,'.gif')).equal(`${dirPath}.gif`);

        // volume and chapter can be specified
        var volume = 'test-volume';
        var chapter = 'test-chapter';
        var suffix = '.json';
        var opts = {
            volume,
            chapter,
            suffix,
        }
        var chapterPath = path.join(local, 'guid-store', volume, chapter);
        var id = 'tv-tc-1.2.3';
        var idPath = path.join(chapterPath, `${id}${suffix}`);
        should(store.guidPath(id,opts)).equal(idPath);
    });
    it("signaturePath(signature) returns file path of signature", function() {
        var store = new GuidStore();
        var guid = mj.hash("hello world");
        var guidDir = guid.substring(0,2);
        var dirPath = path.join(local, 'guid-store', 'common', guidDir);
        var sigPath = path.join(dirPath, guid);
        var signature = {
            guid,
        };
        should(store.signaturePath(signature,'.txt')).equal(`${sigPath}.txt`);

        var storeDir = tmp.tmpNameSync();
        var store = new GuidStore({
            type: 'TestStore',
            storeDir,
            suffix: '.ogg',
        });
        var guid = mj.hash("hello world");
        var commonPath = path.join(storeDir, 'test-store', 'common', guidDir);
        var sigPath = path.join(commonPath, guid);
        var expectedPath = `${sigPath}.ogg`;
        var signature = {
            guid,
        };
        should(store.signaturePath(signature)).equal(expectedPath);
    });

})
