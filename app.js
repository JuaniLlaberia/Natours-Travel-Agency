//Modules
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoute');
const globalErrorHandler = require('./controllers/errorController');

//APP CONFIGURATION (Server on separate file)
const app = express();

//Setting view engine
app.set('view engine', 'pug'); // ==> Pug templates are call views
app.set('views', path.join(__dirname, 'views'));

//GLOBAL MIDDLEWARES
//Serve statis files with Express (use the path in the url without the public) -> from a folder not a route
app.use(express.static(path.join(__dirname, 'public')));

//3rd party middleware (logs the requests in the console)
if (process.env.NODE_ENV === 'development') {
  // console.log(process.env.NODE_ENV);
  app.use(morgan('dev'));
}

//Helmet produces the function automatically
//Its necessary to set SECURITY HTTP Headers
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'http:', 'data:'],
      scriptSrc: ["'self'", 'https:', 'http:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
    },
  }),
);

//Using express rate limit module to limit the amount of request from one IP (avoid certain attacks)
const limiter = rateLimit({
  //100 request per hour
  max: 150,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again later.',
});
//Will only affect all routes that start with the /api
app.use('/api', limiter);

//Body parser => reading data from body into req.body
//Middleware -> can modify the incomming data (between the request and the response) In thois case we add the request data to the body
app.use(
  express.json({
    //If we have a body larger than this amount it will not accept it, as a security measure
    limit: '10kb',
  }),
); //the app.use adds the middleware to the app

//Parses data from cookies
app.use(cookieParser());

//DATA SANITIZATION (Agaist NoSQL query injection)
//It returns a function that help us prevent the noSQL injections
//It filteres all the '$' signs and '.'
app.use(mongoSanitize());

//DATA SANITIZATION (Agaist XSS)
//Cleans any user input from malicious code
//In most cases the schema validators will protect us from XSS but this is a second protection
app.use(xss());

//PREVENT URL PARAMETER POLLUTION (avoid sending extra or weird parameters to the API)
app.use(
  hpp({
    //Properties that we DO ALLOW duplicates in the query string
    //We need to add all the ones that we may want to seach with two values
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'price',
      'difficulty',
    ],
  }),
); //It should be use near the end because it cleans the query string
//And in the case they send two === parameters, it will only use the second one
//AVOID THIS: url?sort=x&sort=y -> it should be together and not in two separate (hackers could use this to their advantage)
//But sometimes we do want to be able to hable duplicates (We use whitelist)

//custom middleware -> If we dont set the route, they apply for every single route/request (if its before the route)
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();

  //HTTP HEADERS
  console.log(req.cookies);
  next();
});

//ROUTING & MOUNTING
app.use('/', viewRouter);
//Mounting the router
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

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
