'use strict';

// Polyfill if the global promise does not exist.
if (!global.Promise) {
  require('es6-promise').polyfill();
}

module.exports = {
  /**
   * Creates a deferred object with resolve and reject functions.
   */
  defer: function() {
    var deferred = {};
    deferred.promise = new Promise(function(resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    return deferred;
  }
};
