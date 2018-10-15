'use strict';

const BigCommerce = require('../lib/bigcommerce'),
  Request = require('../lib/request'),
  should = require('chai').should(),
  sinon = require('sinon');

describe('BigCommerce', () => {
  const self = { };

  const bc = new BigCommerce({
    secret: '123456abcdef',
    clientId: '123456abcdef',
    callback: 'http://foo.com',
    accessToken: '123456',
    storeHash: '12abc'
  });

  beforeEach(() => self.sandbox = sinon.sandbox.create());
  afterEach(() => self.sandbox.restore());

  describe('#constructor', () => {
    it('should return an error if config is missing', () => {
      /* eslint no-new: off */
      should.Throw(() => {
        new BigCommerce();
      }, Error);
    });

    it('should save config to the object', () => {
      const newBc = new BigCommerce({ test: true });
      newBc.config.should.be.a('object');
      newBc.apiVersion.should.equal('v2');
    });

    it('should set api version to a default', () => {
      new BigCommerce({ apiVersion: 'v3' }).apiVersion.should.equal('v3');
    });
  });

  describe('#verify', () => {
    context('given a null signed request', () => {
      it('should return null', () => {
        try {
          bc.verify();
        } catch (e) {
          e.message.should.match(/signed request is required/);
          return;
        }

        throw new Error('You shall not pass!');
      });
    });

    context('given a signed request without a full stop', () => {
      it('should return null', () => {
        try {
          bc.verify('12345');
        } catch (e) {
          e.message.should.match(/full stop/);
          return;
        }

        throw new Error('You shall not pass!');
      });
    });

    context('given an invalid signature', () => {
      it('should return null', () => {
        try {
          bc.verify('eyJmb28iOiJmb28ifQ==.YjMzMTQ2ZGU4ZTUzNWJiOTI3NTI1ODJmNzhiZGM5NzBjNGQ3MjZkZDdkMDY1MjdkZGYxZDA0NGZjNDVjYmNkMQ==');
        } catch (e) {
          e.message.should.match(/invalid/);
          return;
        }

        throw new Error('You shall not pass!');
      });
    });

    context('given an invalid signature (different length)', () => {
      it('should return null', () => {
        try {
          bc.verify('eyJmb28iOiJmb28ifQ==.Zm9v');
        } catch (e) {
          e.message.should.match(/invalid/);
          return;
        }

        throw new Error('You shall not pass!');
      });
    });

    it('should return the JSON data', () => {
      const verify = bc.verify(
        'eyJmb28iOiJmb28ifQ==.YjMzMTQ2ZGU4ZTUzNWJiOTI3NTI1ODJmNzhiZGM' +
        '5NzBjNGQ3MjZkZDdkMDY1MjdkZGYxZDA0NGZjNDVjYmNkMA=='
      );
      verify.foo.should.equal('foo');
    });
  });

  describe('#authorize', () => {
    beforeEach(() => {
      self.runStub = self.sandbox.stub(Request.prototype, 'run')
        .returns(Promise.resolve({ test: true }));
    });

    const query = { code: '', scope: '', context: '' };

    it('should return an object', () => {
      return bc.authorize(query)
        .then(data => data.should.not.be.null);
    });

    context('when the query params are missing', () => {
      it('should return an error', () => {
        return bc.authorize(null)
          .then(() => should.fail('You shall not pass!'))
          .catch(err => err.message.should.match(/are required/));
      });
    });

    context('when the authorization fails', () => {
      beforeEach(() => {
        self.runStub.returns(Promise.reject(new Error('foo')));
      });

      it('should return and error', () => {
        return bc.authorize(query)
          .then(() => should.fail('You shall not pass!'))
          .catch(err => err.message.should.equal('foo'));
      });
    });
  });

  describe('#createAPIRequest', () => {
    it('should create a request object with the correct headers', () => {
      const request = bc.createAPIRequest();
      request.headers['X-Auth-Client'].should.equal('123456abcdef');
      request.headers['X-Auth-Token'].should.equal('123456');
    });

    it('should have the correct API hostname', () => {
      const request = bc.createAPIRequest();
      request.hostname.should.equal('api.bigcommerce.com');
    });
  });

  describe('#request', () => {
    beforeEach(() => {
      self.requestStub = self.sandbox.stub(Request.prototype, 'run')
        .returns(Promise.resolve({ text: '' }));
    });

    it('should make a call to the request object', () => {
      return bc.request('get', '/foo')
        .then(() => sinon.assert.calledOnce(self.requestStub));
    });

    it('should use v3 if specified in config', () => {
      const bcV3 = new BigCommerce({
        secret: '123456abcdef',
        clientId: '123456abcdef',
        callback: 'http://foo.com',
        accessToken: '123456',
        storeHash: '12abc',
        apiVersion: 'v3'
      });

      return bcV3.request('get', '/themes')
        .then(() => sinon.assert.calledWith(self.requestStub, 'get', '/stores/12abc/v3/themes'));
    });

    context('when the header requirements are not met', () => {
      it('should return an error', () => {
        const bc = new BigCommerce({ });
        return bc.request('get', '/foo')
          .then(() => should.fail('You shall not pass!'))
          .catch(e => e.message.should.match(/access token/));
      });
    });

    context('when the response type is xml', () => {
      const xmlBc = new BigCommerce({
        accessToken: '123456',
        clientId: 'abcdef',
        storeHash: 'abcd/1',
        responseType: 'xml'
      });

      it('should call the request object with extension .xml', () => {
        return xmlBc.request('get', '/foo')
          .then(() => sinon.assert.calledWith(self.requestStub, 'get', '/stores/abcd/1/v2/foo.xml'));
      });
    });

    context('when the response type is json', () => {
      it('should make a call to the request object with an empty extension', () => {
        const jsonBc = new BigCommerce({
          accessToken: '123456',
          clientId: 'abcdef',
          storeHash: 'abcd/1',
          responseType: 'json'
        });

        return jsonBc.request('get', '/foo')
          .then(() => sinon.assert.calledWith(self.requestStub, 'get', '/stores/abcd/1/v2/foo'));
      });
    });
  });

  describe('#get', () => {
    beforeEach(() => {
      self.requestStub = self.sandbox.stub(Request.prototype, 'run')
        .returns(Promise.resolve({ text: '' }));
    });

    it('should make a request with the correct arguments', () => {
      return bc.get('/foo')
        .then(res => {
          res.should.deep.equal({ text: '' });
          sinon.assert.calledWith(self.requestStub, 'get', '/stores/12abc/v2/foo', undefined);
        });
    });
  });

  describe('#post', () => {
    beforeEach(() => {
      self.requestStub = self.sandbox.stub(Request.prototype, 'run')
        .returns(Promise.resolve({ text: '' }));
    });

    it('should make a request with the correct arguments', () => {
      return bc.post('/foo', { foo: 'bar' })
        .then(res => {
          res.should.deep.equal({ text: '' });
          sinon.assert.calledWith(self.requestStub, 'post', '/stores/12abc/v2/foo', { foo: 'bar' });
        });
    });
  });

  describe('#put', () => {
    beforeEach(() => {
      self.requestStub = self.sandbox.stub(Request.prototype, 'run')
        .returns(Promise.resolve({ text: '' }));
    });

    it('should make a request with the correct arguments', () => {
      return bc.put('/foo', { foo: 'bar' })
        .then(res => {
          res.should.deep.equal({ text: '' });
          sinon.assert.calledWith(self.requestStub, 'put', '/stores/12abc/v2/foo', { foo: 'bar' });
        });
    });
  });

  describe('#delete', () => {
    beforeEach(() => {
      self.requestStub = self.sandbox.stub(Request.prototype, 'run')
        .returns(Promise.resolve({ text: '' }));
    });

    it('should make a request with the correct arguments', () => {
      return bc.delete('/foo')
        .then(res => {
          res.should.deep.equal({ text: '' });
          sinon.assert.calledWith(self.requestStub, 'delete', '/stores/12abc/v2/foo', undefined);
        });
    });
  });
});
