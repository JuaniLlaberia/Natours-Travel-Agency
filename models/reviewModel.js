const mongoose = require('mongoose');

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

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
