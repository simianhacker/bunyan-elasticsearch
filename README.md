bunyan-elasticsearch
====================

A Bunyan stream for saving logs into Elasticsearch.

## Install

```
npm install bunyan-elasticsearch
```

## Logstash Template

By default Logstash will create a dynamic template that will take care of crating `.raw` fields for your data. In order to replicate this behavior you will need to create the dynamic template manually. You will need to [download template.json](https://raw.github.com/ccowan/bunyan-elasticsearch/master/template.json) and run the following command from the same directory as that file:

```
curl -XPUT localhost:9200/_template/logstash -d @template.json
```

## Example

```
var bunyan = require('bunyan');
var Elasticsearch = require('bunyan-elasticsearch');
var esStream = new Elasticsearch({
  indexPattern: '[logstash-]YYYY.MM.DD',
  type: 'logs',
  host: 'localhost:9200'
});
esStream.on('error', function (err) {
  console.log('Elasticsearch Stream Error:', err.stack);
});

var logger = bunyan.createLogger({
  name: "My Application",
  streams: [
    { stream: process.stdout },
    { stream: esStream }
  ],
  serializers: bunyan.stdSerializers
});

logger.info('Starting application on port %d', app.get('port'));
```

## Options

* `client`: Elasticsearch client. Defaults to new client created with current set of options as an argument
* `type` {string|function}: Elasticsearch `type` field. Default: `'logs'`
* `indexPattern` {string}: Used to generate index if `index` option not set. Default: `'[logstash-]YYYY.MM.DD'`
* `index` {string|function}: Elasticsearch index. Defaults to index generated using index pattern

Options `type` and `index` can be either a string or function. For these options, when the option is set to a function, the function is passed the log entry object as an argument
