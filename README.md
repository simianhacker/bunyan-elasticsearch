bunyan-elasticsearch
====================

A Bunyan stream for saving logs into Elasticsearch.

## Install

```
npm install bunyan-elasticsearch
```

## Logstash Template

By default Logstash will create a dynamic template that will take care of crating `.raw` fields for your data. In order to replicate this behaivor you will need to create the dynamic template manually. You will need to [download template.json](https://raw.github.com/ccowan/bunyan-elasticsearch/master/template.json) and run the following command from the same directory as that file:

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

