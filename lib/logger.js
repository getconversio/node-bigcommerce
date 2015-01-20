/**
 * A simple helper for logging info & errors
 */

 module.exports = {
  /**
   * Log Levels:
   * 0: Error only
   * 1: Info and Error
   */
  level: 0,
  info: function(message) {
    if(this.level < 1) return;
    console.log('\x1b[36mInfo: \x1b[0m%s', message);
  },
  error: function(message) {
    console.log('\x1b[31mError: \x1b[0m%s', message);
  }
 }
