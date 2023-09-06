const mongoose = require('mongoose');
const Tour = require('../models/tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      require: [true, 'You must write a review to create one.'],
      minLength: [20, 'The review must have at least 20 characters.'],
      maxLength: [400, 'The review must have less than 400 characters.'],
    },
    rating: {
      type: Number,
      require: [true, 'You must select a rating.'],
      max: [5, 'The max rating is 5.0 points.'],
      min: [1, 'The min rating is 1.0 point.'],
    },
    edited: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      require: [true, 'A review must belong to a tour.'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      require: [true, 'A review must belong to an user.'],
    },
  },
  {
    //Showing the virtual values that we have
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

//The combination of tour-user must be unique -> An user can only post 1 review per tour (avoid spam)
reviewSchema.index(
  { tour: 1, user: 1 },
  {
    unique: true,
  },
);

//Populate the data
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  //We dont want to populate tour now, because its repetitive
  // .populate({
  //   path: 'tour',
  //   select: 'name',
  // });

  next();
});

//Static method
//Creates the statistics for each tour -> average ratings and quantity (gets updated automatically)
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    //Points to the crr model
    {
      $match: { tour: tourId }, //selected all the reviews that match the tour ID
    },
    {
      //Calculating the statistics
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 }, //Number of ratings
        avgRating: { $avg: '$rating' }, //Score of rating
      },
    },
  ]);

  //Saved the statistics in the current tour
  //We check if there are any reviews for this tour else we set the default
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    ratingsQuantity = 0;
    ratingsAverage = 4;
  }
};

//Every time we create a new review it will run
//DOC MIDDLEWWARE
reviewSchema.post('save', function () {
  //This points to current review
  //Updating stats every time we create
  this.constructor.calcAverageRatings(this.tour);
});

//We want it to run everytime we call the findOneAndUpdate(findByIdAndUpdate) and the findOneAndDelete(findByAndDelete)
//Because this 2 methods cant access what we did before but we want to update the statistics everytime a review is updated or removed (so the stats in the tour doc are updated)
//QUERY MIDDLEWARE
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //The problem is the this keyword here DOESNT reference the document but the query.

  //With this technique we pass data from the pre to the post middleware
  this.reviewDoc = await this.clone().findOne(); //The clone is to copy the query

  //After running this we would have stored a copy of the query so then we can access that in the post in order to calculate the stats
  //because if we calculate the stats in the pre, the data we would be using is still all because it hasnt been updated yet

  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  //Here we retrieve the review doc and the review contructor (model) in order to call and calculate the avg ratings everytime a review is updated or deleted
  await this.reviewDoc.constructor.calcAverageRatings(this.reviewDoc.tour);

  //We werent able to run everything in the post because by this time the query has already finished
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
