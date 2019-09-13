### Summary
Javascript library for converting barcode scanner 
input stream to timestamped observations.

### Description
Barcode scanners typically return scanned data as a single line of serial data.
For example, scanning three barcodes (A0001, A0002, A0003) would result in raw data of:

```
A0001
A0002
A0003
```

However, this stream of barcode information isn't particularly useful 
on its own because it is not timestamped. 
What we really want instead is a stream of timestamped observations such as:

```JS
{"t":"2019-18-12T04:04:47.180Z", "tag": "scanned", "value":"A0001"}
{"t":"2019-18-12T04:04:48.180Z", "tag": "scanned", "value":"A0002"}
{"t":"2019-18-12T04:04:53.180Z", "tag": "scanned", "value":"A0003"}
```

Additionally, we might want to map certain barcodes using a lookup table
such as:

```JS
{
    "A0001": {
        "tag": "color",
        "value": "red",
    },
    "A0002": {
        "tag": "color",
        "value": "blue",
    },
}
```

Our observation stream would now look like this:

```JS
{"t":"2019-18-12T04:04:47.180Z", "tag": "color", "value":"red"}
{"t":"2019-18-12T04:04:48.180Z", "tag": "color", "value":"blue"}
{"t":"2019-18-12T04:04:53.180Z", "tag": "scanned", "value":"A0003"}
```

### Observation
An Observation is a timestamped key/value pair:

```JS
{
    "t":"2019-09-13T17:25:25.113Z", // timestamp
    "tag":"color",  // key
    "value":"red"   // value
}
```

Observations are serializable.

### Scanner
The Scanner class converts scanned lines into Observations: 

```JS
var {
    Scanner,
    Observation,
} = require('oya-scan');

var map = {
    A0001: {
        tag: 'color',
        value: 'red',
    },
    A0002: {
        tag: 'color',
        value: 'blue',
    },
};

var scanner = new Scanner({
    map,
});

scanner.scan('A0001'); // {"t":"2019-09-13T17:25:25.113Z","tag":"color","value":"red"}
scanner.scan('A0002'); // {"t":"2019-09-13T17:25:26.023","tag":"color","value":"blue"}
scanner.scan('A0003'); // {"t":"2019-09-13T17:25:27.912Z","tag":"scanned","value":"A0003"}
```

The Scanner class also provides a streaming method that returns a Promise.
The returned promise resolves upon input stream end with a summary 
of the transformation. 

```JS
var promise = scanner.transform(process.stdin, process.stdout);
promise.then(result => {
    console.log(result);
    // {
    //     bytes: 18,
    //     observations: 3,
    //     started: "2019-09-13T17:25:17.799Z",
    //     ended: "2019-09-13T17:34:02.112Z",
    //     argv: [ ... ],
    // }
});
```

The Scanner class also provides a streaming method that returns a Promise.
The returned promise resolves upon input stream end with a summary 
of the transformation. 

```JS
var promise = scanner.transform(process.stdin, process.stdout);
promise.then(result => {
    console.log(result);
    // {
    //     bytes: 18,
    //     observations: 3,
    //     started: "2019-09-13T17:25:17.799Z",
    //     ended: "2019-09-13T17:34:02.112Z",
    //     argv: [ ... ],
    // }
});
```

The transformed output stream will
have one line for each serialized Observation.

```JS
{"t":"2019-09-13T17:25:25.113Z","tag":"color","value":"red"}
{"t":"2019-09-13T17:25:26.023","tag":"color","value":"blue"}
{"t":"2019-09-13T17:25:27.912Z","tag":"scanned","value":"A0003"}
```

