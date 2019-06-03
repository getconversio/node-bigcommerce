'use strict';

const Request = require('../lib/request'),
  should = require('chai').should(),
  nock = require('nock'),
  HttpsAgent = require('agentkeepalive').HttpsAgent,
  zlib = require('zlib');

describe('Request', () => {
  const self = { };

  const request = new Request('api.bigcommerce.com', { headers: { 'Content-Type': 'application/json' } });

  afterEach(() => nock.cleanAll());

  context('given a missing hostname', () => {
    it('should return an error if hostname is missing', () => {
      /* eslint no-new: off */
      should.Throw(() => {
        new Request();
      }, Error);
    });
  });

  context('given a 429 status code', () => {
    beforeEach(() => {
      self.ordersCall = nock('https://api.bigcommerce.com')
        .post('/orders')
        .reply(429, { }, { 'X-Retry-After': 0.1 })
        .post('/orders')
        .reply(200, { });
    });

    it('should retry the request', () => {
      return request.run('post', '/orders')
        .then(() => self.ordersCall.isDone().should.equal(true));
    });

    context('given a failOnLimitReached option', () => {
      const failRequest = new Request('api.bigcommerce.com', {
        headers: { 'Content-Type': 'application/json' },
        failOnLimitReached: true
      });

      it('should return an error', () => {
        return failRequest.run('post', '/orders')
          .then(() => should.fail('You shall not pass!'))
          .catch(e => {
            e.message.should.match(/rate limit/);
            e.retryAfter.should.equal(0.1);
          });
      });
    });
  });

  context('given a bad request or internal error is returned', () => {
    beforeEach(() => {
      nock('https://api.bigcommerce.com')
        .post('/orders')
        .reply(400, {});
    });

    it('should return an error', () => {
      return request.run('post', '/orders', { })
        .then(() => should.fail('You shall not pass!'))
        .catch(e => e.message.should.match(/Request returned error code/));
    });
  });

  context('if "error" are found in the response JSON', () => {
    beforeEach(() => {
      nock('https://api.bigcommerce.com')
        .post('/orders')
        .reply(200, { error: 'An error has occurred.' });
    });

    it('should return an error', () => {
      return request.run('post', '/orders', { })
        .then(() => should.fail('You shall not pass!'))
        .catch(e => e.message.should.match(/An error has occurred/));
    });
  });

  context('if "errors" are found in the response JSON', () => {
    beforeEach(() => {
      nock('https://api.bigcommerce.com')
        .post('/orders')
        .reply(200, { errors: ['An error has occurred.'] });
    });

    it('should return an error', () => {
      return request.run('post', '/orders', { })
        .then(() => should.fail('You shall not pass!'))
        .catch(e => e.message.should.match(/An error has occurred/));
    });
  });

  context('given a malformed request JSON', () => {
    beforeEach(() => {
      nock('https://api.bigcommerce.com')
        .defaultReplyHeaders({ 'Content-Type': 'application/json' })
        .post('/orders')
        .reply(200, '<malformed>');
    });

    it('should return an error', () => {
      return request.run('post', '/orders', { })
        .then(() => should.fail('You shall not pass!'))
        .catch(e => e.message.should.match(/Unexpected token/));
    });
  });

  context('if json is not returned', () => {
    beforeEach(() => {
      nock('https://api.bigcommerce.com')
        .defaultReplyHeaders({ 'Content-Type': 'application/xml' })
        .post('/orders')
        .reply(200, '<xml></xml>');
      nock('https://api.bigcommerce.com')
        .defaultReplyHeaders({ 'Content-Type': 'application/json' })
        .post('/customers')
        .reply(200, '<html></html>');
    });

    it('should return the raw response', () => {
      return request.run('post', '/orders', { })
        .then(res => res.should.equal('<xml></xml>'));
    });

    it('should attach the response if the JSON cannot be parsed', () => {
      return request.run('post', '/customers', { })
        .catch(err => err.should.have.property('responseBody'));
    });
  });

  context('timeout', () => {
    beforeEach(() => {
      nock('https://api.bigcommerce.com')
        .post('/orders')
        .replyWithError('ECONNRESET');
    });

    it('should return an error', () => {
      return request.run('post', '/orders', { })
        .then(() => should.fail('You shall not pass!'))
        .catch(e => e.message.should.match(/ECONNRESET/));
    });
  });

  it('should attach a keep-alive HTTPS agent', () => {
    nock('https://api.bigcommerce.com')
      .post('/orders')
      .reply(200, { order: true });

    const request = new Request('api.bigcommerce.com', {
      headers: { 'Content-Type': 'application/json' },
      agent: new HttpsAgent({
        maxSockets: 30,
        maxFreeSockets: 30,
        timeout: 60000,
        keepAliveTimeout: 30000
      })
    });

    return request.run('post', '/orders')
      .then(res => res.should.be.a('object'));
  });

  it('should return a JSON object on success', () => {
    nock('https://api.bigcommerce.com')
      .post('/orders')
      .reply(200, { order: true });

    return request.run('post', '/orders')
      .then(res => {
        res.should.be.a('object');
        res.order.should.equal(true);
      });
  });

  it('should accept and parse a GZIP JSON response', () => {
    const data = JSON.stringify({ order: true });
    const buffer = Buffer.from(data);
    const zipped = zlib.gzipSync(buffer);
    nock('https://api.bigcommerce.com')
      .post('/orders')
      .reply(200, zipped, {
        'X-Transfer-Length': String(zipped.length),
        'Content-Length': undefined,
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/json'
      });

    const request = new Request('api.bigcommerce.com', {
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
      }
    });

    return request.run('post', '/orders')
      .then(res => {
        should.exist(res);
        res.should.have.property('order', true);
      });
  });

  it('should accept and parse a non-GZIP JSON response', () => {
    const data = JSON.stringify({ order: true });
    const buffer = Buffer.from(data);

    nock('https://api.bigcommerce.com')
      .post('/orders')
      .reply(200, buffer, {
        'X-Transfer-Length': String(buffer.length),
        'Content-Length': undefined,
        'Content-Type': 'application/json'
      });

    const request = new Request('api.bigcommerce.com', {
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': '*'
      }
    });

    return request.run('post', '/orders')
      .then(res => {
        should.exist(res);
        res.should.have.property('order', true);
      });
  });
});
