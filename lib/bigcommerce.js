'use strict';

/**
 * BigCommerce OAuth2 Authentication and API access
 *
 * @param {Object} config
 * @return null
 *
 * Example Config
 * {
 *   logLevel: 'info',
 *   clientId: 'hjasdfhj09sasd80dsf04dfhg90rsds',
 *   secret: 'odpdf83m40fmxcv0345cvfgh73bdwjc',
 *   callback: 'https://mysite.com/bigcommerce'
 *   accessToken: 'ly8cl3wwcyj12vpechm34fd20oqpnl',
 *   storeHash: 'x62tqn',
 *   responseType: 'json'
 * }
 */

var logger = require('./logger'),
  crypto = require('crypto'),
  Request = require('./request');

var BigCommerce = function(cfg) {
  // The config is required to access the API
  if (!cfg) {
    var error = 'Config missing. The config object is ' +
      'required to make any call to the BigCommerce API';
    logger.error(error);
    throw new Error(error);
  }

  this.config = cfg;
  this.logger = logger;

  // Set the log level, default: 0
  var levels = { info: 1, error: 0 };
  this.config.logLevel = this.config.logLevel ?
    levels[this.config.logLevel] : 0;
  logger.level = this.config.logLevel;
};

BigCommerce.prototype.verify = function(signedRequest) {
  if (!signedRequest) {
    logger.error('The signed request is required ' +
      'to verify the call.');
    return;
  }

  var splitRequest = signedRequest.split('.');

  if (splitRequest.length < 2) {
    logger.error('The signed request will come in ' +
      'two parts seperated by a .(full stop). this ' +
      'signed request contains less than 2 parts.');
    return;
  }

  var signature = new Buffer(splitRequest[1], 'base64').toString('utf8');
  var json = new Buffer(splitRequest[0], 'base64').toString('utf8');
  var data = JSON.parse(json);

  logger.info('JSON: ' + json);
  logger.info('Signature: ' + signature);

  var expected = crypto.createHmac('sha256', this.config.secret)
    .update(json)
    .digest('hex');

  logger.info('Expected Signature: ' + expected);

  if (expected === signature) {
    logger.info('Signature is valid');
    return data;
  }

  logger.error('Signature is invalid');

  return;
};

BigCommerce.prototype.callback = function(payload, cb) {
  // Verify the self signed request
  logger.info('Signed Payload:');
  logger.info(payload);

  var data = this.verify(payload);
  if (!data) {
    return cb(new Error('The signed request provide was invalid.'));
  }

  logger.info('Data sent by BigCommerce:');
  logger.info(data);

  cb(null, data);
};

BigCommerce.prototype.authorise = function(query, cb) {
  if (!query) {
    var qError = 'The URL query paramaters are required.';
    logger.error(qError);
    return cb(new Error(qError));
  }

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  var payload = {
    client_id: this.config.clientId,
    client_secret: this.config.secret,
    redirect_uri: this.config.callback,
    grant_type: 'authorization_code',
    code: query.code,
    scope: query.scope,
    context: query.context
  };

  var request = new Request(
    'login.bigcommerce.com',
    { 'Content-Type': 'application/json' },
    this.config.logLevel,
    this.config.failOnLimitReached
  );

  request.completeRequest(
    'post',
    '/oauth2/token',
    payload,
    function(err, data, response) {
      if (err) {
        logger.error(err);
        logger.error(response.text);
        return cb(err);
      }

      logger.info('Auth Successful, object returned:');
      logger.info(data);
      logger.info(response.statusCode);
      return cb(null, data);
    }
  );
};

BigCommerce.prototype.checkRequirements = function(cb) {
  if (!this.config.accessToken || !this.config.storeHash) {
    var error = 'Get request error: the access token and store hash are ' +
    'required to call the BigCommerce API';
    logger.error(error);
    return cb(new Error(error));
  }
  cb();
};

BigCommerce.prototype.createAPIRequest = function() {
  return new Request(
    'api.bigcommerce.com',
    {
      'Content-Type': 'application/json',
      'X-Auth-Client': this.config.clientId,
      'X-Auth-Token': this.config.accessToken
    },
    this.config.logLevel,
    this.config.failOnLimitReached
  );
};

BigCommerce.prototype.request = function(type, path, data, cb) {
  var _this = this;

  this.checkRequirements(function(err) {
    if (err) {
      return cb(err);
    }

    var extension = '';

    switch (_this.config.responseType) {
      case 'json':
        extension = '.json';
        break;
      case 'xml':
        extension = '.xml';
        break;
    }

    var request = _this.createAPIRequest();
    var fullPath = '/stores/' +
      _this.config.storeHash +
      '/v2' + path.replace(/(\?|$)/, extension + '$1');

    request.completeRequest(type, fullPath, data, cb);
  });
};

BigCommerce.prototype.get = function(path, cb) {
  return this.request('get', path, null, cb);
};

BigCommerce.prototype.post = function(path, data, cb) {
  return this.request('post', path, data, cb);
};

BigCommerce.prototype.put = function(path, data, cb) {
  return this.request('put', path, data, cb);
};

BigCommerce.prototype.delete = function(path, data, cb) {
  return this.request('delete', path, data, cb);
};

module.exports = BigCommerce;
