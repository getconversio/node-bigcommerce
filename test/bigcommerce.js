var BigCommerce = require('../lib/bigcommerce'),
  Request = require('../lib/request'),
  should = require('chai').should(),
  nock = require('nock'),
  sinon = require('sinon');

describe('Constructor: #BigCommerce', function(){

  it('Should return an error if config is missing', function(){
    should.Throw(function(){
      new BigCommerce();
    }, Error);
  });

  it('Should save config to the object', function(){
    var config = { test: true },
      bc = new BigCommerce(config);

    bc.config.should.not.be.null;
  });

  it('Should set the logger to the correct level', function(){
    var config = { logLevel: 'info' };
      bc = new BigCommerce(config);

    bc.logger.level.should.equal(1);
  });

});

describe('Verify: #BigCommerce', function(){

  it('Should return null when the signed request is null', function(){
    var config = { test: true },
      bc = new BigCommerce(config);

    var verify = bc.verify();
    should.not.exist(verify);
  });

  it('Should return null when the signed request is able to be split in 2 by full stop', function(){
    var config = { test: true },
      bc = new BigCommerce(config);

    var verify = bc.verify('12345');
    should.not.exist(verify);
  });

  it('Should return null if the signature is invalid', function(){
    var config = { secret: '123456abcdef' },
      bc = new BigCommerce(config);

    var verify = bc.verify('eyJmb28iOiJmb28ifQ==.Zm9v');
    should.not.exist(verify);
  });

  it('Should return the JSON data if the signature is valid', function(){
    var config = { secret: '123456abcdef' },
      bc = new BigCommerce(config);

    var verify = bc.verify('eyJmb28iOiJmb28ifQ==.YjMzMTQ2ZGU4ZTUzNWJiOTI3NTI1ODJmNzhiZGM' +
      '5NzBjNGQ3MjZkZDdkMDY1MjdkZGYxZDA0NGZjNDVjYmNkMA==');
    verify.foo.should.equal('foo');
  });

});

describe('Callback: #BigCommerce', function(){

  it('Should return and error when an invalid signature is sent', function(done){
    var config = { secret: '123456abcdef' },
      bc = new BigCommerce(config);

    bc.callback('eyJmb28iOiJmb28ifQ==.Zm9v', function(err){
      err.should.not.be.null;
      done();
    });
  });

  it('Should return the data when the signature is valid', function(done){
    var config = { secret: '123456abcdef' },
      bc = new BigCommerce(config);

    bc.callback('eyJmb28iOiJmb28ifQ==.YjMzMTQ2ZGU4ZTUzNWJiOTI3NTI1ODJmNzhiZGM' +
      '5NzBjNGQ3MjZkZDdkMDY1MjdkZGYxZDA0NGZjNDVjYmNkMA==', function(err, data){
      should.not.exist(err);
      data.foo.should.equal('foo');
      done();
    });
  });

});

describe('Authorize: #BigCommerce', function(){

  it('Should return an error when the query params are missing', function(done){
    var config = { secret: '123456abcdef', clientId: '123456abcdef' },
      bc = new BigCommerce(config);

    bc.authorise(null, function(err){
      err.should.not.be.null;
      done();
    });
  });

  it('Should return and error if the authorisation failed', function(done){
    var config = { secret: '123456abcdef', clientId: '123456abcdef', callback: 'http://foo.com' },
      bc = new BigCommerce(config),
      query = { code: '', scope: '', context: '' };

    var requestStub = sinon.stub(Request.prototype, 'completeRequest', function(method, path, data, cb){
      cb(new Error('Test Request Error'), null, {text: 'Test error text'});
    });

    bc.authorise(query, function(err, data){
      should.not.exist(data);
      err.should.not.be.null;
      requestStub.restore();
      done();
    });
  });

  it('Should return an object when the authorisation is successful', function(done){
    var config = { secret: '123456abcdef', clientId: '123456abcdef', callback: 'http://foo.com' },
      bc = new BigCommerce(config),
      query = { code: '', scope: '', context: '' };

    var requestStub = sinon.stub(Request.prototype, 'completeRequest', function(method, path, data, cb){
      cb(null, {}, {text: ''});
    });

    bc.authorise(query, function(err, data){
      should.not.exist(err);
      data.should.not.be.null;
      requestStub.restore();
      done();
    });
  });

});

describe('Helpers: #BigCommerce', function(){

  describe('Check Requirements', function(){
  
    it('Should return an error when the access token or store hash is missing', function(done){
      var config = {},
        bc = new BigCommerce(config);

      var check = bc.checkRequirements(function(err){
        err.should.not.be.null;
        done();
      });
    });

    it('Should return false when access token and store hash are in the config', function(done){
      var config = {accessToken: '123456', storeHash: '12abc'},
        bc = new BigCommerce(config);

      var check = bc.checkRequirements(function(err){
        should.not.exist(err);
        done();
      });
    });
  
  });

  describe('Create API Request', function(){

    it('Should create a request object with the correct headers', function(){
      var config = { accessToken: '123456', clientId: 'abcdef' },
        bc = new BigCommerce(config);

      var request = bc.createAPIRequest();
      request.headers['Content-Type'].should.equal('application/json');
      request.headers['X-Auth-Client'].should.equal('abcdef');
      request.headers['X-Auth-Token'].should.equal('123456');
    });

    it('Should pass the correct log level to the request object', function(){
      var config = {accessToken: '123456', clientId: 'abcdef', logLevel: 'info'},
        bc = new BigCommerce(config);

      var request = bc.createAPIRequest();
      request.logger.level.should.equal(1);
    });

    it('Should have the correct API hostname', function(){
      var config = {accessToken: '123456', clientId: 'abcdef', logLevel: 'info'},
        bc = new BigCommerce(config);

      var request = bc.createAPIRequest();
      request.hostname.should.equal('api.bigcommerce.com');
    });

  });

  describe('Request', function(){

    it('Should return an error when the header requirements are not met', function(done){
      var config = {accessToken: '123456'},
        bc = new BigCommerce(config);

      bc.request('get', '/foo', null, function(err){
        err.should.not.be.null;
        done();
      });
    });

    it('Should make a call to the request object with no extension when no responseType is given', function(done){
      var config = { accessToken: '123456', clientId: 'abcdef', storeHash: 'abcd/1' },
        bc = new BigCommerce(config);

      var requestStub = sinon.stub(Request.prototype, 'completeRequest', function(method, path, data, cb){
        console.log(method, path);
        path.should.equal('/stores/abcd/1/v2/foo');
        cb(null, {}, {text: ''});
      });

      bc.request('get', '/foo', null, function(){
        requestStub.restore();
        done();
      });

    });

    it('Should make a call to the request object with extension .xml when the response type is xml', function(done){
      var config = { accessToken: '123456', clientId: 'abcdef', storeHash: 'abcd/1', responseType: 'xml'},
        bc = new BigCommerce(config);

      var requestStub = sinon.stub(Request.prototype, 'completeRequest', function(method, path, data, cb){
        path.should.equal('/stores/abcd/1/v2/foo.xml');
        cb(null, {}, {text: ''});
      });

      bc.request('get', '/foo', null, function(){
        requestStub.restore();
        done();
      });

    });

    it('Should make a call to the request object with extension .json when the response type is json', function(done){
      var config = { accessToken: '123456', clientId: 'abcdef', storeHash: 'abcd/1', responseType: 'json' },
        bc = new BigCommerce(config);

      var requestStub = sinon.stub(Request.prototype, 'completeRequest', function(method, path, data, cb){
        path.should.equal('/stores/abcd/1/v2/foo.json');
        cb(null, {}, {text: ''});
      });

      bc.request('get', '/foo', null, function(){
        requestStub.restore();
        done();
      });

    });

    it('Should make a call to the request object when requirements are met', function(done){
      var config = { accessToken: '123456', clientId: 'abcdef', storeHash: 'abcd/1' },
        bc = new BigCommerce(config);

      var requestStub = sinon.stub(Request.prototype, 'completeRequest', function(method, path, data, cb){
        cb(null, {}, {text: ''});
      });
      var spy = sinon.spy(requestStub);

      bc.request('get', '/foo', null, function(){
        spy.should.be.called;
        requestStub.restore();
        done();
      });

    });

  });

  describe('Get', function(){

    it('Should call the request helper with the correct arguments', function(done){
      var config = {},
        bc = new BigCommerce(config);

      var requestStub = sinon.stub(BigCommerce.prototype, 'request', function(type, path, data, cb){
        type.should.equal('get');
        path.should.not.be.null;
        should.not.exist(data);
        cb(null, {}, {text: ''});
      });

      bc.get('/foo', function(){
        requestStub.restore();
        done();
      })

    });

  });

  describe('Post', function(){

    it('Should call the request helper with the correct arguments', function(done){
      var config = {},
        bc = new BigCommerce(config);

      var requestStub = sinon.stub(BigCommerce.prototype, 'request', function(type, path, data, cb){
        type.should.equal('post');
        path.should.not.be.null;
        data.should.not.be.null;
        cb(null, {}, {text: ''});
      });

      bc.post('/foo', {}, function(){
        requestStub.restore();
        done();
      })

    });

  });

  describe('Put', function(){

    it('Should call the request helper with the correct arguments', function(done){
      var config = {},
        bc = new BigCommerce(config);

      var requestStub = sinon.stub(BigCommerce.prototype, 'request', function(type, path, data, cb){
        type.should.equal('put');
        path.should.not.be.null;
        data.should.not.be.null;
        cb(null, {}, {text: ''});
      });

      bc.put('/foo', {}, function(){
        requestStub.restore();
        done();
      })

    });

  });

  describe('Delete', function(){

    it('Should call the request helper with the correct arguments', function(done){
      var config = {},
        bc = new BigCommerce(config);

      var requestStub = sinon.stub(BigCommerce.prototype, 'request', function(type, path, data, cb){
        type.should.equal('delete');
        path.should.not.be.null;
        data.should.not.be.null;
        cb(null, {}, {text: ''});
      });

      bc.delete('/foo', {}, function(){
        requestStub.restore();
        done();
      })

    });

  });

});

describe('Logger: #BigCommerce', function(){

  it('Should be set to a log level of zero by default', function(){
    var logger = require('../lib/logger');
    logger.level.should.equal(0);
  });

  it('Should log an error at any log level', function(){
    var logger = require('../lib/logger');

    var spy = sinon.spy(console, 'log');

    logger.error('Logging test error at 0');
    logger.level = 1;
    logger.error('Logging test error at 1');
    spy.calledTwice.should.be.true;
    spy.restore();
  });

  it('Should log info at level one', function(){
    var logger = require('../lib/logger');
    var spy = sinon.spy(console, 'log');
    logger.level = 1;
    logger.info('Logging test error at 1');
    spy.calledOnce.should.be.true;
    spy.restore();
  });

  it('Should not log info at level zero', function(){
    var logger = require('../lib/logger');
    var spy = sinon.spy(console, 'log');
    logger.level = 0;
    logger.info('Logging test error at 1');
    spy.callCount.should.equal(0);
    spy.restore();
  });

});

describe('Request: #BigCommerce', function(){

  afterEach(function(){
    nock.cleanAll();
  });

  it('Should return an error if hostname is missing', function(){
    should.Throw(function(){
      new Request();
    }, Error);
  });

  it('Should retry the request when a 429 status code is returned', function(done){
    var retry = nock('https://api.bigcommerce.com')
      .defaultReplyHeaders({
        'X-Retry-After': 0.1
      })
      .post('/orders')
      .reply(429, {});

    var request = new Request('api.bigcommerce.com');
    request.completeRequest('post', '/orders', {}, function(){});

    var cRequest = sinon.stub(request, 'completeRequest', function(method, path, data, cb){
      done();
    });

  });

  it('Should return an error if a bad request or internal error is returned', function(done){
    var api = nock('https://api.bigcommerce.com')
      .post('/orders', {})
      .reply(400, {});

    var request = new Request('api.bigcommerce.com');
    request.completeRequest('post', '/orders', {}, function(err, data, res){
      err.should.not.be.null;
      done();
    });

  });

  it('Should return an error if "error" are found in the response JSON', function(done){
    var api = nock('https://api.bigcommerce.com')
      .post('/orders', {})
      .reply(200, {error: 'An error has occurred.'});

    var request = new Request('api.bigcommerce.com', null);
    request.completeRequest('post', '/orders', {}, function(err, data, res){
      err.should.not.be.null;
      err.message.should.equal('An error has occurred.');
      done();
    });
  });

  it('Should return an error if "errors" are found in the response JSON', function(done){
    var api = nock('https://api.bigcommerce.com')
      .post('/orders', {})
      .reply(200, {errors: ['An error has occurred.']});

    var request = new Request('api.bigcommerce.com', null);
    request.completeRequest('post', '/orders', {}, function(err, data, res){
      err.should.not.be.null;
      err.message.should.equal('["An error has occurred."]');
      done();
    });
  });

  it('Should return an error the request JSON is malformed', function(done){
    var api = nock('https://api.bigcommerce.com')
      .defaultReplyHeaders({
        'content-type': 'application/json'
      })
      .post('/orders', {})
      .reply(200, '<malformed>');

    var request = new Request('api.bigcommerce.com');
    request.completeRequest('post', '/orders', {}, function(err, data, res){
      err.should.not.be.null;
      err.message.should.equal('Unexpected token <');
      done();
    });
  });

  it('Should return the raw response if json is not returned', function(done){
    var api = nock('https://api.bigcommerce.com')
      .defaultReplyHeaders({
        'content-type': 'application/xml'
      })
      .post('/orders', {})
      .reply(200, '<xml></xml>');

    var request = new Request('api.bigcommerce.com');
    request.completeRequest('post', '/orders', {}, function(err, data, res){
      should.not.exist(err);
      data.should.be.a.string;
      done();
    });
  });

  it('Should return a JSON object on success', function(done){
    var api = nock('https://api.bigcommerce.com')
      .post('/orders', {})
      .reply(200, {order:true});

    var request = new Request('api.bigcommerce.com', {'Content-Type': 'application/json'}, 0);
    request.completeRequest('post', '/orders', {}, function(err, data, res){
      should.not.exist(err);
      data.should.be.a('object');
      done();
    });
  });

});
