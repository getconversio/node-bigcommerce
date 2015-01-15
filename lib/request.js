/**
 * To make the requests asynchronously
 */

var logger = require('./logger');

var Request = function(hostname, headers, logLevel) {
  this.hostname = hostname;
  this.headers = headers
  logger.level = logLevel || 0;
};

Request.prototype.post = function(path, data, cb) {
  this.completeRequest('post', path, cb, data);
};

Request.prototype.get = function(path, cb) {
  this.completeRequest('get', path, cb);
};

Request.prototype.delete = function(path, data, cb) {
  this.completeRequest('delete', path, cb, data);
};

Request.prototype.put = function(path, data, cb) {
  this.completeRequest('put', path, cb, data);
};

Request.prototype.completeRequest = function(method, path, cb, data) {

  logger.info('Requesting Data from: https://' + this.hostname + path + ' Using the ' + method + ' method');

  var https = require('https'),
    dataString = JSON.stringify(data),
    options = {
      hostname: this.hostname,
      path: path,
      method: method.toUpperCase(),
      post: 443,
      headers: {}
    };

  // Set Custom Headers
  if(this.headers) {
    for(var key in this.headers) {  
      options.headers[key] = this.headers[key];
    }
  }

  if (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE') {
    options.headers['Content-Length'] = new Buffer(dataString).length;
  }

  logger.info('Starting Request, with options: ' + require('util').inspect(options));
  var request = https.request(options, function(res) {
    logger.info('Status Returned: ' + res.statusCode);
    logger.info('Headers Returned: ' + JSON.stringify(res.headers));

    res.setEncoding('utf8');

    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', function() {

      logger.info('Request complete');
      logger.info('Request body: ' + body);

      // If the API limit has been reached
      if(res.statusCode === 429) {
        var timeToWait = res.headers['X-Retry-After'],
          info = 'You have reached the rate limit for the ' 
          + 'BigCommerce API, we will retry again in ' + 
          timeToWait + 'seconds.';

        return setTimeout(function() {
          this.completeRequest(method, path, cb, data);
        }, timeToWait*1000);
      }

      try{
        var json = {};
        if(body.trim !== ''){
          
          logger.info('Body is not empty, parsing.');

          json = JSON.parse(body);
          if (json.hasOwnProperty('error') || json.hasOwnProperty('errors')) {
            return cb(new Error(json.error || JSON.stringify(json.errors)), null, response);
          }
        }
        logger.info('Request complete, returning data and response.');
        return cb(null, json, response);
      }catch(e){
        return cb(e);
      }

    });
  
    if (options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE') {
        request.write(dataString);
    }

    request.end();

    request.on('error', function(e){
      logger.error('Request Error: ' + e);
    });
    
  });

}

module.exports = Request;
