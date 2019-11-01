(function(exports) {
    const fs = require('fs');
    const path = require('path');
    const {
        Readable,
        Writable,
        Transform,
    } = require('stream');
    const { 
        js,
        logger,
    } = require('just-simple').JustSimple;
    const {
        exec,
    } = require('child_process');
    const Observation = require('./observation');

/*
let counter = 0;

const input = new Readable({
  objectMode: true,
  read(size) {
    setInterval( () => {
      this.push({c: counter++});  
    }, 1000);  
  }  
});

const output = new Writable({
  write(chunk, encoding, callback) {
    console.log('writing chunk: ', chunk.toString());
    callback();  
  }  
});

const transform = new Transform({
  writableObjectMode: true,
  transform(chunk, encoding, callback) {
    this.push(JSON.stringify(chunk));
    callback();  
  }  
});

input.pipe(transform);
transform.pipe(output);
*/
    class ObFilter {
        constructor(opts) {
            var that = this;
            logger.logInstance(that, opts);
            that.readSize = 0;
            that.transform = new Transform({
                writableObjectMode: true,
                readableObjectMode: true,
                transform(ob, encoding, cb) {
                    if (ob instanceof Observation) {
                        that.transform.push(that.observe(ob));
                    } else {
                        that.transform.push(
                            new Error('expected Observation')
                        );
                    }
                    cb();
                }
            });
        }

        get inputStream() {
            var that = this;
            if (that._inputStream == null) {
                Object.defineProperty(that, "_inputStream", {
                    value: new Readable({
                        objectMode: true,
                        read(size) { 
                            that.readSize += size; 
                            that.log(`read(${size})`);
                        },  
                    }),
                });
                that._inputStream.pipe(that.transform);
            }
            return that._inputStream;
        }

        observe(ob) {
            return ob;
        }

    }

    module.exports = exports.ObFilter = ObFilter;
})(typeof exports === "object" ? exports : (exports = {}));

