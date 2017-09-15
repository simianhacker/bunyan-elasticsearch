'use strict';

/**
 * Index helper
 */
const Promise = require('bluebird'),
  _ = require('lodash'),
  should = require('should'),
  elasticsearch = require('elasticsearch'),
  requireNew = require('require-new'),
  bses = requireNew('../index.js');

let helper = function () {
  let module = {};

  // avoid test collision by using a different index name
  // in case a test fails, next test will not use same index
  let testIndex = 0;

  let testIndexName = 'bunyan-stream-es-test';

  let testOptions = {
    // fastest index creation for elasticsearch
    settings: {
      index: {
        number_of_shards: 1,
        number_of_replicas: 0
      }
    }
  };

  let testIndexOptions = {
    index: testIndexName,
    options: testOptions
    // ,trace: true // Trace only for dev
  };

  // default Elasticsearch client
  let client = new elasticsearch.Client();

  let latestIndex;

  module.generateIndexName = function () {
    latestIndex = testIndexName + '_' + (testIndex++);
    return latestIndex;
  };


  module.waitForStatus = function (appInstance) {
    return new Promise(function (success, error) {
      // http://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=50s
      appInstance._client.cluster.health({
        waitForStatus: 'green',
        index: latestIndex,
        level: 'indices',
        timeout: '5s'
      }, function (err, response, status) {
        if (err) {
          error(err);
        } else {
          success(response);
        }
      });
    });
  };

  module.connect = function (options) {
    if (!options.index) {
      options.index = module.generateIndexName();
    }

    return new Promise(function (success, error) {
      client.indices.delete({
          index: options.index
        },
        function (err, response, status) {
          success();
        });
    })
      .then(function () {
        return new Promise(function (success, error) {
          client.indices.deleteTemplate({
              name: 'template-' + options.index
            },
            function (err, response, status) {
              if (err && err.displayName != 'NotFound') {
                error(err);
              } else {
                success();
              }
            });
        })
      })
      .then(function () {
        return new bses(options);
      });
    /*
     .then(function (appInstance) {
     return module.waitForStatus(appInstance);
     });*/
  };

  module.getMapping = function (app, typeName) {
    return new Promise(function (success, error) {
      let esType = typeName.toLowerCase() + 's';
      app.client.indices.getMapping({
          index: latestIndex,
          type: esType
        },
        function (err, response, status) {
          if (err) {
            error(err);
          } else {
            if (response
              && response[latestIndex]
              && response[latestIndex].mappings[esType]) {
              success(response[latestIndex].mappings[esType]);
            } else {
              error('mapping not found on response');
            }
          }
        });
    });
  };

  module.getSettings = function (app) {
    return new Promise(function (success, error) {
      app.client.indices.getSettings({
          index: latestIndex,
          flatSettings: true
        },
        function (err, response, status) {
          if (err) {
            error(err);
          } else {
            if (response[latestIndex]
              && response[latestIndex].settings) {
              success(response[latestIndex].settings);
            } else {
              error('settings not found on response');
            }
          }
        });
    });
  };

  /**
   * Force index refresh since ES will not give any result
   * for find() if document is created but index not refreshed
   * @param app
   */
  module.refresh = function (app) {
    return new Promise(function (success, error) {
      app.client.indices.refresh({
          index: latestIndex,
          force: true
        },
        function (err, response, status) {
          if (err) {
            error(err);
          } else {
            success();
          }
        });
    });
  };

  module.deleteIndex = function (indexName, errIfFail) {
    return new Promise(function (success, error) {
      let client = new elasticsearch.Client();
      client.indices.delete({
          index: indexName || latestIndex
        },
        function (err, response, status) {
          if (err && errIfFail) {
            client.close();
            error(err);
          } else {
            client.close();
            success();
          }
        });
    });
  };

  module.deleteTemplate = function (templateName, errIfFail) {
    return new Promise(function (success, error) {
      let client = new elasticsearch.Client();
      client.indices.deleteTemplate({
          name: templateName || latestIndex
        },
        function (err, response, status) {
          if (err && errIfFail) {
            client.close();
            error(err);
          } else {
            client.close();
            success();
          }
        });
    });
  };

  return module;
};

module.exports = helper();
