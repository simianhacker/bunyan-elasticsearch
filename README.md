bunyan-stream-elasticsearch
===========================

[![npm version](https://badge.fury.io/js/bloublou2014/bunyan-stream-elasticsearch.svg)](http://badge.fury.io/js/bunyan-stream-elasticsearch)
[![Build Status](https://travis-ci.org/bloublou2014/bunyan-stream-elasticsearch.svg)](https://travis-ci.org/bloublou2014/bunyan-stream-elasticsearch)
[![Dependency Status](https://david-dm.org/bloublou2014/bunyan-stream-elasticsearch.svg)](https://david-dm.org/bloublou2014/bunyan-stream-elasticsearch)
[![Dev Dependency Status](https://david-dm.org/bloublou2014/bunyan-stream-elasticsearch/dev-status.svg)](https://david-dm.org/bloublou2014/bunyan-stream-elasticsearch#info=devDependencies)

A Bunyan stream for saving logs into Elasticsearch 2.x with custom write function.

## Install

```
npm install bunyan-stream-elasticsearch
```

## Logstash Template

By default bunyan-stream-elasticsearch will create an index with a specific mapping template for your indexPattern.
You can disabled it via option `template:false` or overwrite it via `template:{es template}`

## Custom Write function

You can add or modify elasticsearch document providing a `write(entry)` callback option.
This allow a fine tuning on how document will be defined. Do not forget to override default template if you add new fields.

## Example

```
var bunyan = require('bunyan');
var bunyanStreamElasticsearch = require('bunyan-elasticsearch');

var writeEntryCallback = function(entry) {
   // modify entry values
   entry.myProperty = 'my value';
};

var esStream = new bunyanStreamElasticsearch({
  indexPattern: '[logstash-]YYYY.MM.DD',
  type: 'logs',
  host: 'localhost:9200',
  defaultTemplate:true,
  write : writeEntryCallback
});

// manage error case
esStream.on('error', function (err) {
  console.log('Buyan Stream Elasticsearch Error:', err.stack);
});

// Create the logger itself
var logger = bunyan.createLogger({
  name: "My Application",
  streams: [
    // default stream to console
    { stream: process.stdout },
    // and to Elasticsearch
    { stream: esStream }
  ],
  serializers: bunyan.stdSerializers
});

// start logging
logger.info('Starting application on port %d', app.get('port'));
```

## Options

* `client`: Elasticsearch client. Defaults to new client created with current set of options as an argument
* `type` {string|function}: Elasticsearch `type` field. Default: `'logs'`
* `indexPattern` {string}: Used to generate index if `index` option not set. Default: `'[logstash-]YYYY.MM.DD'`
* `index` {string|function}: Elasticsearch index. Defaults to index generated using index pattern
* `template` {json|boolean}: Elasticsearch Template to push to elasticseach at each start. if `false` no template will be pushed, if `{...}` will act as template remplacement.
* `write` {function} : Custom write callback to modify entry before pushing it to Elasticsearch. 

Options `type` and `index` can be either a string or function. For these options, when the option is set to a function, the function is passed the log entry object as an argument
