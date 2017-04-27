module.exports = function() {
  if (process.env.DEBUG === 'true') {
    console.log.apply(this, arguments);
  }
};
