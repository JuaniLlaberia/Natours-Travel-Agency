//Returns a new annonymous function
module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch((err) => next(err));
};
