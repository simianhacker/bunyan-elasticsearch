var Writable = require('stream').Writable;
var domain = require('domain');
var util = require('util');
var elasticsearch = require('elasticsearch');
var moment = require('moment');

var levels = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
};

function generateIndexName (entry) {
  var datestamp = moment(entry.timestamp).format('YYYY.MM.DD');
  return 'logstash-'+datestamp;
}

function callOrString (value, entry) {
  if (typeof(value) === 'function') {
    return value(entry);
  }
  return value;
}

function ElasticsearchStream (options) {
  this.client = new elasticsearch.Client(options);
  this.type = options.type || 'logs';
  this.index = options.index || generateIndexName; 
  Writable.call(this, options);
}

util.inherits(KibanaStream, Writable);

KibanaStream.prototype._write = function (entry, encoding, callback) {

  var client = this.client;
  var index = this.index;
  var type = this.type;

  var d = domain.create();
  d.on('error', function (err) { 
    console.log("Elasticsearch Error", err.stack);
  });
  d.run(function () {
    entry = JSON.parse(entry.toString('utf8'));
    var env = process.env.NODE_ENV || 'development';

    // Reassign these fields so them match what the default Kibana dashboard 
    // expects to see.
    entry['@timestamp'] = entry.time;
    entry.level = levels[entry.level];
    entry.message = entry.msg;

    // remove duplicate fields
    delete entry.time;
    delete entry.msg;

    var datestamp = moment(entry.timestamp).format('YYYY.MM.DD');

    var options = {
      index: callOrString(index, entry),
      type: callOrString(type, entry),
      body: entry;
    };

    client.create(options, callback);

  });
};

module.exports = ElasticsearchStream;
