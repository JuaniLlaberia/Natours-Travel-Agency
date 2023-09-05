const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
  //Allow nested routes
  //If it wasnt set => we set it with the current logged in user and the selected tour in the URL
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id; //We have access from the protect middleware
  next();
};

exports.markAsEdited = (req, res, next) => {
  req.body = { ...req.body, edited: true };
  next();
};

//Factory functions
//When we need to perform some extra steps o validation, we just create a middleware that runs before this and thats it.
//Of course, not all function are going to be create from a factory, just the generic ones that almost dont change.

//If we do the regular GET request to this route (using the regular route) it will return all the reviews
//But if we use the special nested route we created where we can specify a tour id, we will get all the reviews from that specific tour
exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review, [
  'review',
  'rating',
  'edited',
]);
exports.deleteReview = factory.deleteOne(Review);
