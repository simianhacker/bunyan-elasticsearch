var Writable = require('stream').Writable;
var domain = require('domain');
var util = require('util');
var es = require('elasticserch');
var moment = require('moment');

var levels = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
};

function ElasticsearchStream (options) {
  Writable.call(this, options);
}

util.inherits(KibanaStream, Writable);

KibanaStream.prototype._write = function (entry, encoding, callback) {
  var d = domain.create();
  d.on('error', function (err) { 
    console.log("KibanaStream Error", err.stack);
  });
  d.run(function () {
    entry = JSON.parse(entry.toString('utf8'));

    var env = process.env.NODE_ENV || 'development';

    var data = {
      '@timestamp': entry.time,
      'timestamp': entry.time,
      message: entry.msg,
      tags: [levels[entry.level]],
      name: entry.name,
      level: levels[entry.level],
      hostname: entry.hostname,
      pid: entry.pid,
      '@version': "1"
    }

    if (entry.req) data.req = entry.req;
    if (entry.req) data.res = entry.res;
    if (entry.err) data.err = entry.err;

    var datestamp = moment(entry.timestamp).format('YYYY.MM.DD');
    var options = {
      url: config.elasticsearch.url.replace(/[^\/]+$/, 'logstash-'+datestamp+'/logs'),
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body:  JSON.stringify(data)
    };

    request(options, function (err, resp, body) {
      if (err) console.log('KibanaStream Error Request Error', err.stack); // We need to ignore errors.
      callback();
    });
  });
};

module.exports = ElasticsearchStream;
