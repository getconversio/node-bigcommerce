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
  request = require('superagent');

var config;

function BigCommerce(cfg){

  if (!(this instanceof BigCommerce)) return new BigCommerce(cfg);

  // The config is required to access the API
  if(!cfg){
    var error = 'Config missing. The config object is required to make any call to the BigCommerce API';
    logger.error(error);
    throw new Error(error);
  }

  config = cfg;

  // Set the log level, default: 0
  var levels = { 'info': 1, 'error': 0 };
  logger.level = config.logLevel ? levels[config.logLevel] : 0;

}

BigCommerce.prototype.load = function(req, res, next){

  // Verify the signed request
  logger.info('Signed Payload:');
  logger.info(req.query['signed_payload']);

};

BigCommerce.prototype.authorise = function(req, res, next){
  var payload = {
    'client_id': config.clientId,
    'client_secret': config.secret,
    'redirect_uri': config.callback,
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
        next();
      }else{
        var error = 'Error authenticating, ' + response.status + ' was returned.';
        logger.error(error);
        logger.error(response.text);
        next(err);
      }
    });

};

BigCommerce.prototype.Verify = function(signedRequest){

};

module.exports = BigCommerce;
