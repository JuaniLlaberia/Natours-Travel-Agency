//Modules
const express = require('express');
const morgan = require('morgan');

const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const globalErrorHandler = require('./controllers/errorController');

//APP CONFIGURATION (Server on separate file)
const app = express();

//MIDDLEWARES

//3rd party middleware (logs the requests in the console)
if (process.env.NODE_ENV === 'development') {
  // console.log(process.env.NODE_ENV);
  app.use(morgan('dev'));
}

//Middleware -> can modify the incomming data (between the request and the response) In thois case we add the request data to the body
app.use(express.json()); //the app.use adds the middleware to the app

//Serve statis files with Express (use the path in the url without the public) -> from a folder not a route
app.use(express.static(`${__dirname}/public`));

//custom middleware -> If we dont set the route, they apply for every single route/request (if its before the route)
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//ROUTING & MOUNTING

//Mounting the router
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

//Middleware to catch undefined routes(route that doesnt match (*))
//It must be at the end of all routes because if not, it will always catch this one
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404)); //if we pass somethng to next it will go directly to the error handler
});

//Error handling middleware
//we need to create a regular express middleware but with 4 arguments( so it automatically reccognizes that is an error handler)
//This is only call when there is an error
app.use(globalErrorHandler);

module.exports = app;
