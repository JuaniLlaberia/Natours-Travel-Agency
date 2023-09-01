const mongoose = require('mongoose');
const slugify = require('slugify');
// const validator = require('validator');

//Creating the schema
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, 'A tour must have a name'], //Validator
      unique: true, //We cant create two tours with the same name
      trim: true,
      //String validators (we need to set the runValidators in the update so it also runs there and not only in the creation)
      maxlength: [40, 'The tour name must have less than 40 characters'],
      minlength: [10, 'The tour name must have at least 10 characters'],
      //Custom validator (using a library) => Checks that the name is just A-Z without numbers
      // validate: {
      //   validator: validator.isAlpha,
      //   message: 'Tour names can contain numbers',
      // },
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
      //'Options validator' (the ones inside the array are the posible values) JUST FOR STRINGS
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty must be either easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      //Number validator
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      require: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      //Custom validator (if you need the this keywords we use function else arrow f)
      validate: {
        validator: function (val) {
          //The this only points to crr doc on NEW doc creation NO UPDATE
          return val < this.price; //100 < 200 (The discount must be lower than the full price)
        },
        message: 'Discount price should be below the regular price',
      },
    },
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
      select: false,
    },
    startDates: [Date],
    slug: String,
    secretTour: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true }, //We mark it so that the virtual fields will appear
    toObject: { virtuals: true },
  },
);

//This is data that wont be store in the database but it will be generated everytime we get data from it(Its usually something that
//its not super escencial to keep and waste storage. For example having days and weeks (we can convert from one to another here))
tourSchema.virtual('durationWeeks').get(function () {
  //It must be a function and not an arrow function because the arrow function doesnt have its own this keyword
  return this.duration / 7;
});

//Mongoose middleware -> Will run before an event (in this case before a document saves in the database)
//Pre Document Middleware (it runs before .save() and bofre .create())
tourSchema.pre('save', function (next) {
  //We are going to create a slug for each tour before they arrive to the database
  this.slug = slugify(this.name, { lower: true }); //This points to the object(document) being save

  next(); //We call it in order not to stop the middleware and it goes to the next
});

//Post Document Middleware -> happends after its save
tourSchema.post('save', (doc, next) => {
  //We have access to the saved doc (finished document)
  console.log(doc);

  next();
});

//QUERY MIDDLEWARE
//PRE (can also use POST)
tourSchema.pre(/^find/, function (next) {
  //This regular expression looks for all that start with find (so if its find/findOne FindOneAndUpdate, etc etc)

  //this points to the query
  this.find({ secretTour: { $ne: true } }); //We will only return the tours that are not secret/private

  next();
});

//AGGREGATION MIDDLEWARE
//Before the aggregation is executed
tourSchema.pre('aggregate', function (next) {
  //This points to the aggregation object
  //We are adding another stage to the aggregation to not match the tours with the scretTour ser to true (so it doesnt 'ruin' our stats)
  this.pipeline().unshift({
    $match: { secretTour: { $ne: true } },
  });

  next();
});

//Creating the model
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
