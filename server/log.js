module.exports = function(msg) {
  if (process.env.DEBUG === 'true') {
    const args = Array.prototype.slice.call(arguments);

    console.log(args.join(' '));
  }
};
