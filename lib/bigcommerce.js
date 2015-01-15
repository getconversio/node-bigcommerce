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
  request = require('superagent'),
  crypto = require('crypto');

var BigCommerce = function(cfg) {

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

  return this;

}

BigCommerce.prototype.verify = function(signedRequest) {

  // Split the signed request into an array.
  // First part goes to var signature
  // Second part goes to var jsonStr
  var splitRequest = signedRequest.split('.');

  if(splitRequest.length < 2){  
    logger.error('The signed request will come in ' + 
      'two parts seperated by a .(full stop). this ' +
      'signed request contains less than 2 parts.');
    return;
  }

  var signature = new Buffer(splitRequest[0], 'base64').toString('utf8'),
    json = new Buffer(splitRequest[0], 'base64').toString('utf8'),
    data = JSON.parse(json);

  var expected = crypto.createHmac('sha256', this.config.clientId).text(json).digest('hex');
  if(expected === signature){
    logger.info('Signature is valid');
    return data;
  }else{
    logger.error('Signature is invalid');
    return;
  }

};

BigCommerce.prototype.load = function(req, res, next) {

  // Verify the signed request
  logger.info('Signed Payload:');
  logger.info(req.query['signed_payload']);

  var data = this.verify(req.query['signed_payload']);
  if(!data) 
    return next(new Error('The signed request provide was invalid.'));

  logger.info('Data sent by BigCommerce:');
  logger.info(data);

  req.bigCommerce = data;

  next();
};

BigCommerce.prototype.authorise = function(req, res, next) {
  var payload = {
    'client_id': this.config.clientId,
    'client_secret': this.config.secret,
    'redirect_uri': this.config.callback,
    'grant_type': 'authorization_code',
    code: req.query.code,
    scope: req.query.scope,
    context: req.query.context
  }
  
  request
    .post('https://login.bigcommerce.com/oauth2/token')
    .send(payload)
    .end(function(response){

      if(response.status === 200){
        var data = JSON.parse(response.text);
        logger.info('Auth Successful, object returned:');
        logger.info(data);
        req.bigCommerce = data;
        return next();
      }else{
        var error = 'Error authenticating, ' + 
          response.status + ' was returned.';
        logger.error(error);
        logger.error(response.text);
        return next(err);
      }
    });

};

module.exports = BigCommerce;
