bunyan-stream-elasticsearch
===========================

[![npm version](https://badge.fury.io/js/bunyan-stream-elasticsearch.svg)](https://badge.fury.io/js/bunyan-stream-elasticsearch)
[![Build Status](https://travis-ci.org/bloublou2014/bunyan-stream-elasticsearch.svg)](https://travis-ci.org/bloublou2014/bunyan-stream-elasticsearch)
[![Dependency Status](https://david-dm.org/bloublou2014/bunyan-stream-elasticsearch.svg)](https://david-dm.org/bloublou2014/bunyan-stream-elasticsearch)
[![Dev Dependency Status](https://david-dm.org/bloublou2014/bunyan-stream-elasticsearch/dev-status.svg)](https://david-dm.org/bloublou2014/bunyan-stream-elasticsearch#type=dev)
[![Known Vulnerabilities](https://snyk.io/test/github/bloublou2014/bunyan-stream-elasticsearch/badge.svg)](https://snyk.io/test/github/bloublou2014/bunyan-stream-elasticsearch)

A Bunyan stream for saving logs into Elasticsearch 5.x with custom write function.

## Install

```
npm install bunyan-stream-elasticsearch
```

## Logstash Template

By default bunyan-stream-elasticsearch will create an index with a specific mapping template for your `indexPattern`. Template name will be `template-logstash-` with default settings.
If your index pattern is for example `[test-]YYYY.MM.DD[-pattern]` the template name will be `template-test--pattern`. Each time an instance of this stream is created, the template will be overwritten.
You can disable it by passing the option `template: false` or provide your own via `template: {elastic template}`.

## Custom Write Function

You can add or modify elasticsearch document providing a `write(entry)` callback option.
This allows a fine tuning on how the document will be defined. Do not forget to override the default template if you add new fields.

## Example

```js
const bunyan = require('bunyan');
const ElasticsearchStream = require('bunyan-stream-elasticsearch');

const writeCallback = entry => {
   // modify entry values
   entry.myProperty = 'my value';
   return entry;
};

const esStream = new ElasticsearchStream({
  indexPattern: '[logstash-]YYYY.MM.DD',
  type: 'logs',
  host: 'localhost:9200',
  defaultTemplate: true,
  writeCallback,
});

// manage error case
esStream.on('error', err => console.log('Buyan Stream Elasticsearch Error:', err.stack));

// Create the logger itself
const logger = bunyan.createLogger({
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
* `template` {object|boolean}: Elasticsearch Template to push to elasticseach at each start. If `false` no template will be pushed, if `{...}` will act as template replacement.
* `writeCallback` {function} : Custom write callback to modify the log entry before pushing it to Elasticsearch. 

Options `type` and `index` can be either a string or function. For these options, when the option is set to a function, the function is passed the log entry object as an argument
