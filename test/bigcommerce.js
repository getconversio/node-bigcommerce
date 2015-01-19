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

  it('Should retry the request when a 429 status code is returned', function(){
    var retry = nock('https://api.bigcommerce.com',{
        reqheaders: {
          'X-Retry-After': 15
        }
      })
      .post('/orders')
      .reply(429, {});

    var clock = sinon.useFakeTimers(),
      request = new Request('api.bigcommerce.com');

    request.completeRequest('post', '/orders', {}, function(){});
    
    var spy = sinon.spy(request, 'completeRequest');
    clock.tick(15001);
    spy.should.be.called;

    clock.restore();

  });

  it('Should return an error if a bad request or internal server error is returned', function(done){
    var api = nock('https://api.bigcommerce.com')
      .post('/orders', {})
      .reply(400, {});

    var request = new Request('api.bigcommerce.com');
    request.completeRequest('post', '/orders', {}, function(err, data, res){
      err.should.not.be.null;
      done();
    });

  });

  it('Should return an error if "error" or "errors" are found in the response JSON', function(done){
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

  it('Should return an error the request JSON is malformed', function(done){
    var api = nock('https://api.bigcommerce.com')
      .post('/orders', {})
      .reply(200, '<malformed>');

    var request = new Request('api.bigcommerce.com');
    request.completeRequest('post', '/orders', {}, function(err, data, res){
      err.should.not.be.null;
      err.message.should.equal('Unexpected token <');
      done();
    });
  });

  it('Should return a JSON object on success', function(done){
    var api = nock('https://api.bigcommerce.com')
      .post('/orders', {})
      .reply(200, {order:true});

    var request = new Request('api.bigcommerce.com');
    request.completeRequest('post', '/orders', {}, function(err, data, res){
      should.not.exist(err);
      data.should.be.a('object');
      done();
    });
  });

});
