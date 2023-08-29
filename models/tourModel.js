const mongoose = require('mongoose');

mongoose
  .connect(process.env.DATABASE_ALT, {
    useNewUrlParser: true,
  })
  .then(() => console.log('DB connection succesful!'));

//Creating the schema
const tourSchema = new mongoose.Schema({
  name: {
    type: String,
    require: [true, 'A tour must have a name'], //Validator
    unique: true, //We cant create two tours with the same name
    trim: true,
  },
  duration: {
    type: Number,
    require: [true, 'A tour must have a duration'],
  },
  maxGroupSize: {
    type: Number,
    require: [true, 'A tour must have a group size'],
  },
  difficulty: {
    type: String,
    require: [true, 'A tour must have a difficulty'],
  },
  ratingsAverage: {
    type: Number,
    default: 4.5,
  },
  ratingsQuantity: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    require: [true, 'A tour must have a price'],
  },
  priceDiscount: Number,
  summary: {
    type: String,
    require: [true, 'There must be a summary'],
    trim: true, //Removes the white space at the beggining and the end of the string
  },
  description: {
    type: String,
    trim: true,
  },
  imageCover: {
    type: String,
    required: [true, 'A tour must have a cover image'],
  },
  images: [String], //Array of strings
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  startDates: [Date],
});

//Creating the model
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
