'use strict';

var reload = require('require-reload')(require),
  helpers = require('../lib/helpers'),
  logger = require('../lib/logger'),
  should = require('chai').should(),
  sinon = require('sinon');

describe('Helpers', function() {
  describe('defer', function() {
    it('Should create a deferred promise that resolves', function() {
      var deferred = helpers.defer();
      deferred.resolve(123);
      return deferred.promise
        .then(function(result) {
          result.should.equal(123);
        });
    });

    it('Should create a deferred promise that rejects', function(done) {
      var deferred = helpers.defer();
      deferred.reject(new Error('oh no'));
      deferred.promise
        .then(function() {
          done(new Error('Should not resolve'));
        })
        .catch(function(err) {
          err.message.should.equal('oh no');
          done();
        });
    });

    it('should work when there is no global promise', function() {
      var oldPromise = global.Promise;
      global.Promise = undefined;

      helpers = reload('../lib/helpers');

      var deferred = helpers.defer();
      deferred.resolve(123);
      return deferred.promise
        .then(function(result) {
          result.should.equal(123);
          global.Promise = oldPromise;
        });
    });
  });
});
