const Tour = require('./../models/tourModel');
const APIFeatures = require('../utils/apiFeatures');

//Creating a middleware to modify the query object, so when it reaces the 'getAllTours' its different.
exports.aliasTopTours = (req, res, next) => {
  //We are manually setting this params into the query so we retrieve the top 5 best and cheapest documents
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';

  next();
};

exports.getAllTours = async (req, res) => {
  //Retrieve all the documents from collection
  try {
    //1) WE build the query
    const features = new APIFeatures(Tour.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    //The chaning works because we are returning the 'this'

    //2) Execute the query
    const tours = await features.query;

    //3) Send response
    res.status(200).json({
      status: 'sucess',
      results: tours.length,
      data: {
        tours,
      },
    });
  } catch (err) {
    res.status(404).json({ status: 'fail', message: err });
  }
};

exports.getTour = async (req, res) => {
  //Retrieve specific document
  try {
    const tour = await Tour.findById(req.params.id); // findById === findOne({_id: req.params.id})
    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(400).json({ status: 'fail', message: err });
  }
};

//Function to create tours
exports.createTour = async (req, res) => {
  try {
    //Create a new document
    const newTour = await Tour.create(req.body);
    res.status(201).json({ status: 'success', data: { tour: newTour } });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: 'Invalid data sent!',
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //Returns the updated doc
      runValidators: true,
    });
    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: 'Invalid data sent!',
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

//TOUR STATISTICS
//Aggregation pipeline -> we can manipulate data in the steps
exports.getTourStats = async (req, res) => {
  try {
    const stats = await Tour.aggregate([
      //Stages
      //-Match -> Select certain documents that match this
      {
        $match: { ratingsAverage: { $gte: 4.5 } },
      },
      //-Group
      {
        $group: {
          _id: '$difficulty', //We can select which field we want, and it will return all the stats for that group
          //Example with $difficulty -> it returns the stats for the difficult, the medium and the easy tours
          numTours: { $sum: 1 }, //This adds 1 for each document we have in out db
          numRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      {
        $sort: {
          //Which field we want to sort by
          avgPrice: 1, //1 for ascending
        },
      },
      // {
      //   //We can repeat stages in the pipeline
      //   $match: {
      //     _id: { $ne: 'easy' }, //We retrieve the ones that are Not Equal to the value we pass
      //   },
      // },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = Number(req.params.year);
    const plan = await Tour.aggregate([
      //STAGES
      {
        //Deconstructs an array and build a document for each element of that array
        //We want to have one tour for each of the dates in the tours dates
        $unwind: '$startDates',
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: '$startDates' },
          numTourStarts: { $sum: 1 },
          tours: { $push: '$name' }, //We create an array with the names of the tours
        },
      },
      {
        $addFields: { month: '$_id' }, //Adds a new field
      },
      {
        //We give the fields either a 0 or a 1
        $project: {
          _id: 0, //The ID will not show up
        },
      },
      {
        $sort: { month: 1 },
      },
      {
        //Limit stage -> works the same as in the regular queries
        $limit: 12, //Retrieve all 12 months (as an example)
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: {
        plan,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
};
