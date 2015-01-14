/**
 * BigCommerce OAuth2 Authentication and API access
 *
 * @param {Object} config
 * @return null
 *
 * Example Config  
 * {
 *   logLevel: 'info',
 * }
 */

var logger = require('./logger');

function BigCommerce(config){

  if (!(this instanceof BigCommerce)) return new BigCommerce(config);

  // The config is required to access the API
  if(!config){
    var error = 'Config missing. The config object is required to make any call to the BigCommerce API';
    logger.error(error);
    throw new Error(error);
  }

  this.config = config;

  // Set the log level, default: 0
  var levels = { 'info': 1, 'error': 0 };
  logger.logLevel = this.config.logLevel ? this.config.logLevel : 0;

}

module.exports = BigCommerce;
