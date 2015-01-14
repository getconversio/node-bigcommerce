var BigCommerce = require('../lib/bigcommerce'),
  should = require('chai').should(),
  expect = require('chai').expect();

describe('Constructor: #BigCommerce', function(){

  it('Should return an error if config is missing', function(){
    should.Throw(function(){
      new BigCommerce();
    }, Error);
  });

});
