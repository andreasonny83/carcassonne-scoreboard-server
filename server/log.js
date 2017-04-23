module.exports = function(msg) {
  if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'test') {
    const args = Array.prototype.slice.call(arguments);

    console.log(args.join(' '));
  }
};
