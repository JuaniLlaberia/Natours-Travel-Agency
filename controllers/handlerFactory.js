const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

//Implementing update restriction (Not allow users to update all fields just the ones that they are allow)
//We dont want them to update the ID or tour ID from a review for example.
const filterObj = (obj, allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

//We are going to implement a FACTORY FUNCTION (This will return the functions to perform an action, in this case delete documents from any type)
//We want to reduce code duplicates.
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      //It will run automatilly
      return next(new AppError('No document found with that id', 400));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

//Then we need to call this where we want to create a function

//Factory function for update
exports.updateOne = (Model, updateFields) =>
  catchAsync(async (req, res, next) => {
    //Filtering unwanted fields to update
    let filteredBody;

    if (updateFields) {
      filteredBody = filterObj(req.body, updateFields);
    } else {
      filteredBody = req.body;
    }

    const doc = await Model.findByIdAndUpdate(req.params.id, filteredBody, {
      new: true, //Returns the updated doc
      runValidators: true, //This makes the validators we set in the schema also work on the update
    });

    if (!doc) {
      //It will run automatillca
      return next(new AppError('No tour found with that id', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

//We wrapped our function in the catchAsync error handler

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    //Create a new document
    const newDoc = await Model.create(req.body);
    res.status(201).json({ status: 'success', data: { data: newDoc } });
  });

exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    //Retrieve specific document
    let query = Model.findById(req.params.id);

    //If we pass a populate options object, we will add the populate method, in order to populate child objects (ref to other documents that we need here)
    if (populateOptions) {
      query = query.populate(populateOptions);
    }

    const doc = await query;

    if (!doc) {
      //It will run automatically
      return next(new AppError('No document found with that id', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res) => {
    //Allow nested GET reviews on tour (small hack => it could be implemented separately)
    //If we do the regular GET request to this route (using the regular route) it will return all the reviews
    //But if we use the special nested route we created where we can specify a tour id, we will get all the reviews from that specific tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    //Retrieve all the documents from collection
    //1) WE build the query
    //By doing it like this, we dont have to implement the features in ALL the functions.
    //Now all getAll routes will have access to the features
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    //The chaning works because we are returning the 'this'

    //2) Execute the query
    // const docs = await features.query.explain; SHOW STATISTICS OF THE QUERY
    const docs = await features.query;

    //3) Send response
    res.status(200).json({
      status: 'sucess',
      results: docs.length,
      data: {
        data: docs,
      },
    });
  });
