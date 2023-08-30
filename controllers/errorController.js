const AppError = require('../utils/appError');

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const handleCastErrorDB = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldDB = (error) => {
  const message = `Duplicate field value: '${error.keyValue.name}'. Please use another value.`;

  return new AppError(message, 400);
};

const handleValidationErrorDB = (error) => {
  const errors = Object.values(error.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const sendErrorProd = (err, res) => {
  //For our errors we set the custom response (TRUSTED ERROR)
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    //1) Log error:
    console.error('Error', err);

    //2) Generic errors that we dont have control such as libraries or smth we send a generic message(UNKOWN ERROR)
    //This is in order to not leak the error details to the client
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack); //Show us where the error happend
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    //There are some mongoose errors that we dont create but the user needs to have a meaninful msg, not the default one
    let error = { ...err };
    //CastError is a type of error from mongoose(sending a wrong ID in a route, for example the get tour)
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    //This error is when the field already exist (duplicate name)
    if (error.code === 11000) error = handleDuplicateFieldDB(error);
    //This is to handle validation errors from mongoose schema and return a more friendly message to the user
    if (error._message === 'Validation failed')
      error = handleValidationErrorDB(error);

    sendErrorProd(error, res);
  }

  next();
};
