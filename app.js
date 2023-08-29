//Modules
const express = require('express');
const morgan = require('morgan');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');

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
  console.log('Hello from the middleware :D');
  next(); //We must use the next to keep going if not the cycle breaks and stop
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

//ROUTING & MOUNTING

//Mounting the router
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);

module.exports = app;
