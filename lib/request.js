'use strict';

/**
 * To make the requests asynchronously
 */

var logger = require('./logger'),
  util = require('util');

var Request = function(hostname, headers, logLevel, failOnLimitReached) {
  if (!hostname) {
    var error = 'The host name is required ' +
      'to make the call to the server.';
    logger.error(error);
    throw new Error(error);
  }

  this.hostname = hostname;
  this.headers = headers;
  this.logger = logger;
  logger.level = logLevel || 0;
  this.failOnLimitReached = !!failOnLimitReached;
};

Request.prototype.completeRequest = function(method, path, data, cb) {
  var _this = this;

  logger.info('Requesting Data from: https://' + this.hostname + path +
    ' Using the ' + method + ' method');

  var https = require('https');
  var dataString = JSON.stringify(data);
  var options = {
    hostname: this.hostname,
    path: path,
    method: method.toUpperCase(),
    port: 443,
    headers: {
      'User-Agent': 'node-bigcommerce/1.0.0'
    }
  };

  // Set Custom Headers
  if (this.headers) {
    for (var key in this.headers) {
      options.headers[key] = this.headers[key];
    }
  }

  if (data) {
    options.headers['Content-Length'] = new Buffer(dataString).length;
  }

  logger.info('Starting Request, with options: ' + util.inspect(options));

  var req = https.request(options, function(res) {
    logger.info('Status Returned: ' + res.statusCode);
    logger.info('Headers Returned: ' + JSON.stringify(res.headers));

    res.setEncoding('utf8');

    var body = '';

    // If the API limit has been reached
    if (res.statusCode === 429) {
      var timeToWait = res.headers['x-retry-after'];

      if (_this.failOnLimitReached) {
        return cb(new Error(
          'You have reached the user\'s rate limit for the BigCommerce API. ' +
          'Please retry in ' + timeToWait + ' seconds.'
        ));
      }

      var info = 'You have reached the rate limit for the ' +
        'BigCommerce API, we will retry again in ' +
        timeToWait + ' seconds.';

      logger.error(info);

      return setTimeout(function() {
        logger.info('Restarting request call after suggested time');

        _this.completeRequest(method, path, data, cb);
      }, timeToWait * 1000);
    }

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', function() {

      logger.info('Request complete');

      if (res.statusCode >= 400 && res.statusCode <= 600) {
        var error = new Error('Request failed with code: ' +
          res.statusCode + ' and body: ' + body);
        error.code = res.statusCode;
        logger.error(error.message);
        return cb(error, null, res);
      }

      try {

        var pattern = new RegExp('application/json');
        if (!pattern.test(res.headers['content-type'])) {
          return cb(null, body, res);
        }

        var json = {};

        if (body.trim() !== '') {
          logger.info('Body is not empty, parsing.');

          json = JSON.parse(body);
          if (json.hasOwnProperty('error') || json.hasOwnProperty('errors')) {
            return cb(
              new Error(json.error || JSON.stringify(json.errors)), null, res
            );
          }
        }

        logger.info('Request complete, returning data and response.');

        return cb(null, json, res);
      } catch (e) {
        logger.error('Error parsing JSON: ' + e);
        return cb(e, null, res);
      }

    });

  });

  if (data) {
    logger.info('Sending Data: ' + dataString);
    req.write(dataString);
  }

  req.end();
};

module.exports = Request;
