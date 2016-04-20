'use strict';

var BigCommerce = require('../lib/bigcommerce'),
  Request = require('../lib/request'),
  should = require('chai').should(),
  expect = require('chai').expect,
  sinon = require('sinon'),
  nock = require('nock');

describe('BigCommerce', function() {
  var bc = new BigCommerce({
    secret: '123456abcdef',
    clientId: '123456abcdef',
    callback: 'http://foo.com',
    accessToken: '123456',
    storeHash: '12abc'
  });

  var sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('#constructor', function() {
    it('should return an error if config is missing', function() {
      should.Throw(function() {
        new BigCommerce();
      }, Error);
    });

    it('should save config to the object', function() {
      new BigCommerce({ test: true }).config.should.not.be.null;
    });

    it('should set the logger to the correct level', function() {
      new BigCommerce({ logLevel: 'info' }).logger.level.should.equal(1);
    });
  });

  describe('#verify', function() {
    context('given a null signed request', function() {
      it('should return null', function() {
        var verify = bc.verify();
        should.not.exist(verify);
      });
    });

    context('given a signed request without a full stop', function() {
      it('should return null', function() {
        var verify = bc.verify('12345');
        should.not.exist(verify);
      });
    });

    context('given an invalid signature', function() {
      it('should return null', function() {
        var verify = bc.verify('eyJmb28iOiJmb28ifQ==.Zm9v');
        should.not.exist(verify);
      });
    });

    it('should return the JSON data', function() {
      var verify = bc.verify(
        'eyJmb28iOiJmb28ifQ==.YjMzMTQ2ZGU4ZTUzNWJiOTI3NTI1ODJmNzhiZGM' +
        '5NzBjNGQ3MjZkZDdkMDY1MjdkZGYxZDA0NGZjNDVjYmNkMA=='
      );
      verify.foo.should.equal('foo');
    });
  });

  describe('#callback', function() {
    context('given an invalid signature', function() {
      it('should return an error', function(done) {
        bc.callback('eyJmb28iOiJmb28ifQ==.Zm9v', function(err) {
          err.should.not.be.null;
          done();
        });
      });
    });

    it('should return the data', function(done) {
      bc.callback(
        'eyJmb28iOiJmb28ifQ==.YjMzMTQ2ZGU4ZTUzNWJiOTI3NTI1ODJmNzhiZGM' +
        '5NzBjNGQ3MjZkZDdkMDY1MjdkZGYxZDA0NGZjNDVjYmNkMA==',
        function(err, data) {
          should.not.exist(err);
          data.foo.should.equal('foo');
          done();
        }
      );
    });
  });

  describe('#authorise', function() {
    var query = { code: '', scope: '', context: '' };

    context('when the query params are missing', function() {
      it('should return an error', function(done) {
        bc.authorise(null, function(err) {
          err.should.not.be.null;
          done();
        });
      });
    });

    context('when the authorisation fails', function() {
      it('should return and error', function(done) {
        var requestStub = sandbox.stub(
          Request.prototype,
          'completeRequest',
          function(method, path, data, cb) {
            cb(new Error('Test Request Error'), null, { text: 'Test error text' });
          }
        );

        bc.authorise(query, function(err, data) {
          should.not.exist(data);
          err.should.not.be.null;
          requestStub.restore();
          done();
        });
      });
    });

    it('should return an object', function(done) {
      var requestStub = sandbox.stub(
        Request.prototype,
        'completeRequest',
        function(method, path, data, cb) {
          cb(null, {}, { text: '' });
        }
      );

      bc.authorise(query, function(err, data) {
        should.not.exist(err);
        data.should.not.be.null;
        requestStub.restore();
        done();
      });
    });

    it('should work for its naming alias "authorize"', function(done) {
      var requestStub = sandbox.stub(
        Request.prototype,
        'completeRequest',
        function(method, path, data, cb) {
          cb(null, {}, { text: '' });
        }
      );

      bc.authorize(query, function(err, data) {
        should.not.exist(err);
        data.should.not.be.null;
        requestStub.restore();
        done();
      });
    });
  });

  describe('#checkRequirements', function() {
  });

  describe('#createAPIRequest', function() {
    it('should create a request object with the correct headers', function() {
      var request = bc.createAPIRequest();
      request.headers['Content-Type'].should.equal('application/json');
      request.headers['X-Auth-Client'].should.equal('123456abcdef');
      request.headers['X-Auth-Token'].should.equal('123456');
    });

    it('should pass the correct log level to the request object', function() {
      var infoBc = new BigCommerce({
        accessToken: '123456',
        clientId: 'abcdef',
        logLevel: 'info'
      });

      var request = infoBc.createAPIRequest();
      request.logger.level.should.equal(1);
    });

    it('should have the correct API hostname', function() {
      var request = bc.createAPIRequest();
      request.hostname.should.equal('api.bigcommerce.com');
    });
  });

  describe('#request', function() {
    context('when the header requirements are not met', function() {
      it('should return an error', function(done) {
        new BigCommerce({ }).request('get', '/foo', null, function(err) {
          err.should.not.be.null;
          done();
        });
      });

      it('should reject with an error', function(done) {
        new BigCommerce({ }).request('get', '/foo', null)
          .then(function() {
            done(new Error('Should not resolve'));
          })
          .catch(function(err) {
            err.should.not.be.null;
            done();
          });
      });
    });

    context('when no responseType is given', function() {
      it('should call the request object with no extension', function(done) {
        var requestStub = sandbox.stub(
          Request.prototype,
          'completeRequest',
          function(method, path, data, cb) {
            path.should.equal('/stores/12abc/v2/foo');
            cb(null, {}, { text: '' });
          }
        );

        bc.request('get', '/foo', null, function() {
          requestStub.restore();
          done();
        });
      });
    });

    context('when the response type is xml', function() {
      var xmlBc = new BigCommerce({
        accessToken: '123456',
        clientId: 'abcdef',
        storeHash: 'abcd/1',
        responseType: 'xml'
      });

      it('should call the request object with extension .xml', function(done) {
        var requestStub = sandbox.stub(
          Request.prototype,
          'completeRequest',
          function(method, path, data, cb) {
            path.should.equal('/stores/abcd/1/v2/foo.xml');
            cb(null, {}, { text: '' });
          }
        );

        xmlBc.request('get', '/foo', null, function() {
          requestStub.restore();
          done();
        });
      });
    });

    context('when the response type is json', function() {
      var jsonBc = new BigCommerce({
        accessToken: '123456',
        clientId: 'abcdef',
        storeHash: 'abcd/1',
        responseType: 'json'
      });

      it('should make a call to the request object with extension .json', function(done) {
        var requestStub = sandbox.stub(
          Request.prototype,
          'completeRequest',
          function(method, path, data, cb) {
            path.should.equal('/stores/abcd/1/v2/foo.json');
            cb(null, {}, { text: '' });
          }
        );

        jsonBc.request('get', '/foo', null, function() {
          requestStub.restore();
          done();
        });
      });
    });

    it('should make a call to the request object', function(done) {
      var requestStub = sandbox.stub(
        Request.prototype,
        'completeRequest',
        function(method, path, data, cb) {
          cb(null, {}, { text: '' });
        }
      );

      bc.request('get', '/foo', null, function() {
        sinon.assert.calledOnce(requestStub);
        requestStub.restore();
        done();
      });
    });
  });

  describe('#get', function() {
    it('should make a request with the correct arguments', function(done) {
      var requestStub = sandbox.stub(
        BigCommerce.prototype,
        'request',
        function(type, path, data, cb) {
          type.should.equal('get');
          path.should.not.be.null;
          should.not.exist(data);
          cb(null, {}, { text: '' });
        }
      );

      bc.get('/foo', function() {
        requestStub.restore();
        done();
      });
    });

    it('should resolve a promise with the data', function() {
      var fooNock = nock('https://api.bigcommerce.com')
        .get('/stores/12abc/v2/foo')
        .reply(200, { some: 'data' });

      return bc.get('/foo')
        .then(function(data) {
          fooNock.done();
          data.should.deep.equal({ some: 'data' });
        });
    });

    it('should reject a promise with an error', function(done) {
      var fooNock = nock('https://api.bigcommerce.com')
        .get('/stores/12abc/v2/foo')
        .reply(400, {});

      bc.get('/foo')
        .then(function() {
          done(new Error('Should not resolve'));
        })
        .catch(function(err) {
          err.code.should.equal(400);
          err.should.be.a('error');
          done();
        });
    });
  });

  describe('#post', function() {
    it('should make a request with the correct arguments', function(done) {
      var requestStub = sandbox.stub(
        BigCommerce.prototype,
        'request',
        function(type, path, data, cb) {
          type.should.equal('post');
          path.should.not.be.null;
          data.should.not.be.null;
          cb(null, {}, { text: '' });
        }
      );

      bc.post('/foo', {}, function() {
        requestStub.restore();
        done();
      });
    });

    it('should resolve a promise with the data', function() {
      var fooNock = nock('https://api.bigcommerce.com')
        .post('/stores/12abc/v2/foo')
        .reply(200, { some: 'data' });

      return bc.post('/foo')
        .then(function(data) {
          fooNock.done();
          data.should.deep.equal({ some: 'data' });
        });
    });
  });

  describe('#put', function() {
    it('should make a request with the correct arguments', function(done) {
      var requestStub = sandbox.stub(
        BigCommerce.prototype,
        'request',
        function(type, path, data, cb) {
          type.should.equal('put');
          path.should.not.be.null;
          data.should.not.be.null;
          cb(null, {}, { text: '' });
        }
      );

      bc.put('/foo', {}, function() {
        requestStub.restore();
        done();
      });
    });

    it('should resolve a promise with the data', function() {
      var fooNock = nock('https://api.bigcommerce.com')
        .put('/stores/12abc/v2/foo')
        .reply(200, { some: 'data' });

      return bc.put('/foo')
        .then(function(data) {
          fooNock.done();
          data.should.deep.equal({ some: 'data' });
        });
    });
  });

  describe('#delete', function() {
    it('should make a request with the correct arguments', function(done) {
      var requestStub = sandbox.stub(
        BigCommerce.prototype,
        'request',
        function(type, path, data, cb) {
          type.should.equal('delete');
          path.should.not.be.null;
          data.should.not.be.null;
          cb(null, {}, { text: '' });
        }
      );

      bc.delete('/foo', {}, function() {
        requestStub.restore();
        done();
      });
    });

    it('should resolve a promise with the data', function() {
      var fooNock = nock('https://api.bigcommerce.com')
        .delete('/stores/12abc/v2/foo')
        .reply(200, { some: 'data' });

      return bc.delete('/foo')
        .then(function(data) {
          fooNock.done();
          data.should.deep.equal({ some: 'data' });
        });
    });
  });
});
