// Transform a Promise response to a Node.js callback response
// Inspired by https://github.com/then/promise
module.exports = function (callback, result) {
  if (callback) {
    result.then(
      value => setImmediate(() => callback(null, value)),
      err => setImmediate(() => callback(err))
    );
  } else {
    return result;
  }
};
