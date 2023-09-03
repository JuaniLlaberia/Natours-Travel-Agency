class APIFeatures {
  constructor(query, queryString) {
    this.query = query; //This is the query that we will execute at the end after adding all the filters, sorts, etc we need
    this.queryString = queryString;
  }

  //FILTERING//
  filter() {
    //This prevents the API seeing the page or this values as fields in the document
    //So we exclude them from the query, and use them separatly to handle pagination, sorting, etc
    //Its a way of ignoring them and not try to search for those values in the data
    // console.log(this.queryString);
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);

    //From this: {difficulty: 'easy', duration: {$gte: 5}} to: { difficulty: 'easy', duration: { '$gte': '6' } }
    //When we want to filter with gte, lte, gt or lt we need to have the $ infront but in the req.query it comes without it
    let queryStr = JSON.stringify(queryObj);
    //We hard code it with regex, because those are the only cases we needed it
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); //replace accepts a callback function and as a parameter the replaced word, so we can use it

    this.query = this.query.find(JSON.parse(queryStr));

    return this; //We return the entire object (so we can chain methods in the execution)
  }

  //SORTING
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.replaceAll(',', ' '); //We do this in order to chain sorts, we can pass to the url endpoint multiple fields to sort by, and it will sort in the order we pass them
      //if in the query we have sort=[field] it sorts it in ascending order but if we have sort=-[field] it will be descending order
      this.query = this.query.sort(sortBy);
    } else {
      //Default sort
      this.query = this.query.sort('-createdAt _id');
    }

    return this;
  }

  //LIMIT FIELDS
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.replaceAll(',', ' ');
      this.query = this.query.select(fields);
    } else {
      //We are not returning the __v field becase it something that mongoose uses internally and we dont want to send it to the user
      this.query = this.query.select('-__v'); //the - excludes that field
    }

    return this;
  }

  //PAGINATION
  paginate() {
    const page = Number(this.queryString.page) || 1;
    const limit = Number(this.queryString.limit) || 10;
    const skip = (page - 1) * limit; //After how many documents we want to read (if we have a skip of 10, it will skip the first 10 results and start retrieving from the 11th)

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
