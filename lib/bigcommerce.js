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
 *   responseType: 'json',
 *   headers: { 'Accept-Encoding': '*' }
 * }
 */

const logger = require('debug')('node-bigcommerce:bigcommerce'),
  crypto = require('crypto'),
  Request = require('./request');

class BigCommerce {
  constructor(config) {
    if (!config) {
      throw new Error(
        'Config missing. The config object is required to make any call to the ' +
        'BigCommerce API'
      );
    }

    this.config = config;
    this.apiVersion = this.config.apiVersion || 'v2';
  }

  verify(signedRequest) {
    if (!signedRequest) {
      throw new Error('The signed request is required to verify the call.');
    }

    const splitRequest = signedRequest.split('.');
    if (splitRequest.length < 2) {
      throw new Error(
        'The signed request will come in two parts seperated by a .(full stop). ' +
        'this signed request contains less than 2 parts.'
      );
    }

    const signature = Buffer.from(splitRequest[1], 'base64').toString('utf8');
    const json = Buffer.from(splitRequest[0], 'base64').toString('utf8');
    const data = JSON.parse(json);

    logger('JSON: ' + json);
    logger('Signature: ' + signature);

    const expected = crypto.createHmac('sha256', this.config.secret)
      .update(json)
      .digest('hex');

    logger('Expected Signature: ' + expected);

    if (
      expected.length !== signature.length ||
      !crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(signature, 'utf8'))
    ) {
      throw new Error('Signature is invalid');
    }

    logger('Signature is valid');
    return data;
  }

  async authorize(query) {
    if (!query) throw new Error('The URL query paramaters are required.');

    const payload = {
      client_id: this.config.clientId,
      client_secret: this.config.secret,
      redirect_uri: this.config.callback,
      grant_type: 'authorization_code',
      code: query.code,
      scope: query.scope,
      context: query.context
    };

    const request = new Request('login.bigcommerce.com', {
      failOnLimitReached: this.config.failOnLimitReached
    });

    return await request.run('post', '/oauth2/token', payload);
  }

  createAPIRequest() {
    const accept = this.config.responseType === 'xml' ? 'application/xml' : 'application/json';

    return new Request('api.bigcommerce.com', {
      headers: Object.assign({
        Accept: accept,
        'X-Auth-Client': this.config.clientId,
        'X-Auth-Token': this.config.accessToken
      }, this.config.headers || {}),
      failOnLimitReached: this.config.failOnLimitReached,
      agent: this.config.agent
    });
  }

  async request(type, path, data) {
    if (!this.config.accessToken || !this.config.storeHash) {
      throw new Error(
        'Get request error: the access token and store hash are required to ' +
        'call the BigCommerce API'
      );
    }

    const extension = this.config.responseType === 'xml' ? '.xml' : '';
    const version = this.apiVersion;

    const request = this.createAPIRequest();

    let fullPath = `/stores/${this.config.storeHash}/${version}`;
    if (version !== 'v3') {
      fullPath += path.replace(/(\?|$)/, extension + '$1');
    } else {
      fullPath += path;
    }

    return await request.run(type, fullPath, data);
  }

  async get(path) {
    return await this.request('get', path);
  }

  async post(path, data) {
    return await this.request('post', path, data);
  }

  async put(path, data) {
    return await this.request('put', path, data);
  }

  async delete(path) {
    return await this.request('delete', path);
  }
}

module.exports = BigCommerce;
