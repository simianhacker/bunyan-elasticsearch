const Writable = require('stream').Writable;
const util = require('util');
const elasticsearch = require('elasticsearch');
const moment = require('moment');
const defaultTemplate = require('./template.json');
const _ = require('lodash');

let levels = {
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


function generateRawTemplateName(pattern) {
  // get only part between []
  let re = /(\[([^\]]+)])/g;
  let match;
  let names = [];

  while (match = re.exec(pattern)) {
    names.push(match[2]);
  }

  if (names.length < 1) {
    names = [pattern];
  }

  return {
    template: names[0] + '*',
    name: 'template-' + names.join('-')
  };
}


function ElasticsearchStream(options) {
  options = options || {};
  this._client = options.client || new elasticsearch.Client(options);
  this._type = options.type || 'logs';
  let indexPattern = options.indexPattern || '[logstash-]YYYY.MM.DD';
  this._index = options.index || generateIndexName.bind(null, indexPattern);
  this._writeCallback = options.writeCallback || undefined;
  this._template = options.template || defaultTemplate;

  // async
  this.initTemplate(options.index || indexPattern, this._template);

  Writable.call(this, options);
}

util.inherits(ElasticsearchStream, Writable);


ElasticsearchStream.prototype.initTemplate = function (name, template) {
  if (template === false)
    return;

  let tpl = generateRawTemplateName(name);

  template.template = tpl.template;

  return this._client.indices.putTemplate({
    name: tpl.name,
    create: false, // can be replace a previous one
    body: template
  });
};

ElasticsearchStream.prototype._write = function (entry, encoding, callback) {

  let client = this._client;
  let index = this._index;
  let type = this._type;

  let input = JSON.parse(entry.toString('utf8'));

  // Reassign these fields so them match what the default Kibana dashboard
  // expects to see.
  let output = {
    // The _timestamp field is deprecated. Instead, use a normal date field and set its value explicitly.
    'date': input.time,
    'level_int': input.level,
    'level': levels[input.level],
    'message': input.msg,
    'datestamp': moment(input.time).format('YYYY.MM.DD'),
  };

  // merge
  output = _.defaults(output, input);

  delete output.msg;
  delete output.v;
  delete output.time;


  if (input.err) {
    output.error = input.err;
    if (!output.message) output.message = output.error.message;
  }

  if (this._writeCallback) {
    this._writeCallback(output, input);
  }

  let options = {
    index: callOrString(index, entry),
    type: callOrString(type, entry),
    body: output
  };

  let self = this;
  client.index(options, function (err) {
    if (err) {
      self.emit('error', err);
    }
    callback();
  });
};

module.exports = ElasticsearchStream;
