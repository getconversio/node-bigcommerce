'use strict';

var Request = require('../lib/request'),
  should = require('chai').should(),
  nock = require('nock'),
  sinon = require('sinon');

describe('Request', function() {
  var request = new Request(
    'api.bigcommerce.com',
    { 'Content-Type': 'application/json' },
    0
  );

  afterEach(function() {
    nock.cleanAll();
  });

  context('given a missing hostname', function() {
    it('should return an error if hostname is missing', function() {
      should.Throw(function() {
        new Request();
      }, Error);
    });
  });

  context('given a 429 status code', function() {
    beforeEach(function() {
      nock('https://api.bigcommerce.com')
        .defaultReplyHeaders({
          'X-Retry-After': 0.1
        })
        .post('/orders')
        .reply(429, {});
    });

    it('should retry the request', function(done) {
      request.completeRequest('post', '/orders', {}, function() {});

      sinon.stub(request, 'completeRequest', function() {
        request.completeRequest.restore();
        done();
      });
    });

    context('given a failOnLimitReached option', function() {
      it('should return an error', function(done) {
        var failRequest = new Request(
          'api.bigcommerce.com',
          { 'Content-Type': 'application/json' },
          0,
          true
        );

        failRequest.completeRequest('post', '/orders', {}, function(err) {
          err.should.not.be.null;
          done();
        });
      });
    });
  });

  context('given a bad request or internal error is returned', function() {
    beforeEach(function() {
      nock('https://api.bigcommerce.com')
        .post('/orders', {})
        .reply(400, {});
    });

    it('should return an error', function(done) {
      request.completeRequest('post', '/orders', {}, function(err) {
        err.should.not.be.null;
        done();
      });
    });
  });

  context('if "error" are found in the response JSON', function() {
    beforeEach(function() {
      nock('https://api.bigcommerce.com')
        .post('/orders', {})
        .reply(200, { error: 'An error has occurred.' });
    });

    it('should return an error', function(done) {
      request.completeRequest('post', '/orders', {}, function(err) {
        err.should.not.be.null;
        err.message.should.equal('An error has occurred.');
        done();
      });
    });
  });

  context('if "errors" are found in the response JSON', function() {
    beforeEach(function() {
      nock('https://api.bigcommerce.com')
        .post('/orders', {})
        .reply(200, { errors: ['An error has occurred.'] });
    });

    it('should return an error', function(done) {
      request.completeRequest('post', '/orders', {}, function(err) {
        err.should.not.be.null;
        err.message.should.equal('["An error has occurred."]');
        done();
      });
    });
  });

  context('given a malformed request JSON', function() {
    beforeEach(function() {
      nock('https://api.bigcommerce.com')
        .defaultReplyHeaders({
          'content-type': 'application/json'
        })
        .post('/orders', {})
        .reply(200, '<malformed>');
    });

    it('should return an error the ', function(done) {
      request.completeRequest('post', '/orders', {}, function(err) {
        err.should.not.be.null;
        err.message.should.equal('Unexpected token <');
        done();
      });
    });
  });

  context('if json is not returned', function() {
    beforeEach(function() {
      nock('https://api.bigcommerce.com')
        .defaultReplyHeaders({
          'content-type': 'application/xml'
        })
        .post('/orders', {})
        .reply(200, '<xml></xml>');
    });

    it('should return the raw response ', function(done) {
      request.completeRequest('post', '/orders', {}, function(err, data) {
        should.not.exist(err);
        data.should.be.a.string;
        done();
      });
    });
  });

  it('Should return a JSON object on success', function(done) {
    nock('https://api.bigcommerce.com')
      .post('/orders', {})
      .reply(200, { order:true });

    request.completeRequest('post', '/orders', {}, function(err, data) {
      should.not.exist(err);
      data.should.be.a('object');
      done();
    });
  });
});
