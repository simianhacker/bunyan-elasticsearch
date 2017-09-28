'use strict';

const Writable = require('stream').Writable;
const elasticsearch = require('elasticsearch');
const moment = require('moment');
const defaultTemplate = require('./template.json');
const _ = require('lodash');

const levels = {
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
  if (typeof (value) === 'function') {
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

class ElasticsearchStream extends Writable {
  constructor(options) {
    super(options);
    options = options || {};
    this._client = options.client || new elasticsearch.Client(options);
    this._type = options.type || 'logs';
    let indexPattern = options.indexPattern || '[logstash-]YYYY.MM.DD';
    this._index = options.index || generateIndexName.bind(null, indexPattern);
    this._writeCallback = options.writeCallback;
    this._template = options.template == null || options.template === true ? defaultTemplate : options.template;

    // async
    this.initTemplate(options.index || indexPattern, this._template);
  }

  initTemplate(name, template) {
    if (template === false)
      return;

    let tpl = generateRawTemplateName(name);

    template.template = tpl.template;

    return this._client.indices.putTemplate({
      name: tpl.name,
      create: false, // can replace a previous one
      body: template
    });
  }

  _write(entry, encoding, callback) {
    const client = this._client;
    const index = this._index;
    const type = this._type;

    const input = JSON.parse(entry.toString('utf8'));

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
      output = this._writeCallback(output, input) || output;
    }

    const options = {
      index: callOrString(index, entry),
      type: callOrString(type, entry),
      body: output
    };

    const self = this;
    client.index(options, function (err) {
      if (err) {
        self.emit('error', err);
      }
      callback();
    });
  }
}

module.exports = ElasticsearchStream;
