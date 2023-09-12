const AppError = require('../utils/appError');

const sendErrorDev = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  //RENDERED FRONT END
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const handleJWTError = () => new AppError('Invalid token. Log in again.', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Log in again.', 401);

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

const sendErrorProd = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith('/api')) {
    // A) Operational error (trusted)
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    //B) Programming error/Unkown one
    //1) Log error:
    console.error('Error', err);

    //2) Generic errors that we dont have control such as libraries or smth we send a generic message(UNKOWN ERROR)
    //This is in order to not leak the error details to the client
    return res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }

  //RENDERED WEBSITE
  //A) Operational
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }

  //B)Unkown error
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack); //Show us where the error happend
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    //There are some mongoose errors that we dont create but the user needs to have a meaninful msg, not the default one
    let error = { ...err };
    error.message = err.message;

    //CastError is a type of error from mongoose(sending a wrong ID in a route, for example the get tour)
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    //This error is when the field already exist (duplicate name)
    if (error.code === 11000) error = handleDuplicateFieldDB(error);
    //This is to handle validation errors from mongoose schema and return a more friendly message to the user
    if (error._message === 'Validation failed')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }

  next();
};
