'use strict';

let should = require('should'),
  helper = require('./helper');

describe('Connection', function () {

  let options = {};
  let app;

  before(function (done) {
    this.timeout(10000);
    // connect to elasticsearch
    helper.connect(options)
      .then(function (instance) {
        console.log('initialized');
        app = instance;
        done();
      })
      .catch(done);
  });

  after(function (done) {
    this.timeout(10000);
    helper.deleteIndex(app._index)
      .then(function () {
        return helper.deleteTemplate(app._index);
      })
      .then(function () {
        console.log('index deleted');
        done();
      })
      .catch(done);
  });

  it('check template', function () {
    should.equal(1, 1);
  });

});
