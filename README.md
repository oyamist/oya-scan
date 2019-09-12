Converts barcode scanner input stream to timestamped observations

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

Our observation stream will now look like this:

```JS
{"t":"2019-18-12T04:04:47.180Z", "tag": "color", "value":"red"}
{"t":"2019-18-12T04:04:48.180Z", "tag": "color", "value":"blue"}
{"t":"2019-18-12T04:04:53.180Z", "tag": "scanned", "value":"A0003"}
```

