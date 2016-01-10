/**
 * guid.js
 *
 * Generates a random unique id for the new games
 * @return [String] The unique id in string format
 */
module.exports = function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000 | 0)
      .toString(16)
      .substring(1);
  }

  return s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}
