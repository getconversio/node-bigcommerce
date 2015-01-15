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
 * }
 */

var logger = require('./logger'),
  crypto = require('crypto'),
  util = require('util'),
  Request = require('./request');

var BigCommerce = function(cfg) {

  if (!(this instanceof BigCommerce)) 
    return new BigCommerce(cfg);

  // The config is required to access the API
  if(!cfg){
    var error = 'Config missing. The config object is ' + 
      'required to make any call to the BigCommerce API';
    logger.error(error);
    throw new Error(error);
  }

  this.config = cfg;

  // Set the log level, default: 0
  var levels = { 'info': 1, 'error': 0 };
  logger.level = this.config.logLevel ? levels[this.config.logLevel] : 0;

}

BigCommerce.prototype.verify = function(signedRequest) {

  var splitRequest = signedRequest.split('.');

  if(splitRequest.length < 2){  
    logger.error('The signed request will come in ' + 
      'two parts seperated by a .(full stop). this ' +
      'signed request contains less than 2 parts.');
    return;
  }

  var signature = new Buffer(splitRequest[1], 'base64').toString('utf8'),
    json = new Buffer(splitRequest[0], 'base64').toString('utf8'),
    data = JSON.parse(json);

  logger.info('JSON: ' + json);
  logger.info('Signature: ' + signature);

  var expected = crypto.createHmac('sha256', this.config.secret).update(json).digest('hex');

  logger.info('Expected Signature: ' + expected);
  if(expected === signature){
    logger.info('Signature is valid');
    return data;
  }else{
    logger.error('Signature is invalid');
    return;
  }

};

BigCommerce.prototype.load = function(payload, cb) {

  // Verify the self signed request
  logger.info('Signed Payload:');
  logger.info(payload);

  var data = this.verify(payload);
  if(!data) 
    return cb(new Error('The signed request provide was invalid.'));

  logger.info('Data sent by BigCommerce:');
  logger.info(data);

  cb(null, data);
};

BigCommerce.prototype.authorise = function(query, cb) {
  var payload = {
    'client_id': this.config.clientId,
    'client_secret': this.config.secret,
    'redirect_uri': this.config.callback,
    'grant_type': 'authorization_code',
    code: query.code,
    scope: query.scope,
    context: query.context
  }
  
  var request = new Request('https://login.bigcommerce.com', 
    null, this.config.logLevel);

  request.post('/oauth2/token',
    payload, 
    function(err, data){

      if(err){
        var error = 'Error authenticating, ' + 
           err.message + ' was returned.';
        logger.error(err);
        logger.error(response.text);
        return cb(err);
      }

      logger.info('Auth Successful, object returned:');
      logger.info(data);
      return cb(null, data);

    });

};

module.exports = BigCommerce;
