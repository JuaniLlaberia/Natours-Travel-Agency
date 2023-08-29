const Tour = require('./../models/tourModel');

//Getting the data

exports.getAllTours = async (req, res) => {
  //Retrieve all the documents from collection
  try {
    //1) WE build the query

    //FILTERING//

    //This prevents the API seeing the page or this values as fields in the document
    //So we exclude them from the query, and use them separatly to handle pagination, sorting, etc
    //Its a way of ignoring them and not try to search for those values in the data
    const queryObj = { ...req.query };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    //ADV FILTERING//

    //From this: {difficulty: 'easy', duration: {$gte: 5}} to: { difficulty: 'easy', duration: { '$gte': '6' } }
    //When we want to filter with gte, lte, gt or lt we need to have the $ infront but in the req.query it comes without it
    //So where we replace those words and add the proper format
    let queryStr = JSON.stringify(queryObj);
    //We hard code it with regex, because those are the only cases we needed it
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); //replace accepts a callback function and as a parameter the replaced word, so we can use it

    let query = Tour.find(JSON.parse(queryStr)); //We pass the object with the filters we want

    //SORTING//
    if (req.query.sort) {
      const sortBy = req.query.sort.replaceAll(',', ' '); //We do this in order to chain sorts, we can pass to the url endpoint multiple fields to sort by, and it will sort in the order we pass them
      //if in the query we have sort=[field] it sorts it in ascending order but if we have sort=-[field] it will be descending order
      query = query.sort(sortBy);
    } else {
      //Default sort
      query = query.sort('-createdAt _id');
    }

    //FIELD LIMITING// Only retrieve the field we want
    if (req.query.fields) {
      const fields = req.query.fields.replaceAll(',', ' ');
      query = query.select(fields);
    } else {
      //We are not returning the __v field becase it something that mongoose uses internally and we dont want to send it to the user
      query = query.select('-__v'); //the - excludes that field
    }

    //PAGINATION//
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit; //After how many documents we want to read (if we have a skip of 10, it will skip the first 10 results and start retrieving from the 11th)

    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const numTours = await Tour.countDocuments();
      if (skip >= numTours) throw new Error('This page does not exist');
    }

    //2) Execute the query
    const tours = await query;

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
