var Writable = require('stream').Writable;
var util = require('util');
var elasticsearch = require('elasticsearch');
var moment = require('moment');
var defaultTemplate = require('./template.json');

var levels = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
};

function generateIndexName(pattern, entry) {
  return moment.utc(entry.timestamp).format(pattern);
}

function callOrString(value, entry) {
  if (typeof(value) === 'function') {
    return value(entry);
  }
  return value;
}


function ElasticsearchStream(options) {
  options = options || {};
  this._client = options.client || new elasticsearch.Client(options);
  this._type = options.type || 'logs';
  var indexPattern = options.indexPattern || '[logstash-]YYYY.MM.DD';
  this._index = options.index || generateIndexName.bind(null, indexPattern);
  this._writeCallback = options.write || undefined;
  this._template = options.template || defaultTemplate;

  // async
  this.initTemplate(this._index, this._template);

  Writable.call(this, options);
}

util.inherits(ElasticsearchStream, Writable);


ElasticsearchStream.prototype.initTemplate = function (name, template) {
  if (template === false)
    return;

  template.template = name + '*';

  return this._client.indices.putTemplate({
    name: 'template-' + name,
    create: false, // can be replace a previous one
    body: template
  });
};

ElasticsearchStream.prototype._write = function (entry, encoding, callback) {

  var client = this._client;
  var index = this._index;
  var type = this._type;

  entry = JSON.parse(entry.toString('utf8'));
  var env = process.env.NODE_ENV || cst.DEV_ENV;

  // Reassign these fields so them match what the default Kibana dashboard
  // expects to see.
  var output = {
    // The _timestamp field is deprecated. Instead, use a normal date field and set its value explicitly.
    'date': entry.time,
    'level_int': entry.level,
    'level': levels[entry.level],
    'message': entry.msg,
    'node_env': env,
    'datestamp': moment(entry.time).format('YYYY.MM.DD')
  };

  if (entry.err) {
    output.error = entry.err;
    if (!output.message) output.message = output.error.message;
  }

  if (this._writeCallback) {
    this._writeCallback(output);
  }

  var options = {
    index: callOrString(index, entry),
    type: callOrString(type, entry),
    body: output
  };

  var self = this;
  client.create(options, function (err) {
    if (err) {
      self.emit('error', err);
    }
    callback();
  });
};

module.exports = ElasticsearchStream;
