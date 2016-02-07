'use strict';

var Request = require('../lib/request'),
  logger = require('../lib/logger'),
  should = require('chai').should(),
  sinon = require('sinon');

describe('Logger', function() {
  it('should be set to a log level of zero by default', function() {
    logger.level.should.equal(0);
  });

  it('Should log an error at any log level', function() {
    var stub = sinon.stub(console, 'log');

    logger.error('Logging test error at 0');
    logger.level = 1;
    logger.error('Logging test error at 1');

    sinon.assert.calledTwice(stub);
    stub.restore();
  });

  it('should log info at level one', function() {
    var stub = sinon.stub(console, 'log');

    logger.level = 1;
    logger.info('Logging test error at 1');

    sinon.assert.calledOnce(stub);
    stub.restore();
  });

  it('should not log info at level zero', function() {
    var stub = sinon.stub(console, 'log');

    logger.level = 0;
    logger.info('Logging test error at 1');

    sinon.assert.notCalled(stub);
    stub.restore();
  });
});
