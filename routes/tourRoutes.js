const express = require('express');
const tourController = require('../controllers/tourController');
const authenticationController = require('../controllers/authenticationController');
const reviewRouter = require('../routes/reviewRoutes');

//Create a new router -> We are creating a 'sub-app' for each resource
//Creating Router
const router = express.Router();

//////////////////////////////////////////////////////////////
//What we need:
/*
POST /tour/id/reviews -> Createa review for specific tour
GET /tour/id/reviews -> Get reviews from specific tour
GET /tour/id/reviews/id -> Get specific review from specific tour
*/

//When it finds this specific routes, it will go to the route that we indicate, instead of the ones in this router
//Basically first it matches the /tour route, and then here it matches this special routes we set (in case they dont match, we use the regular routes of this route)

//Mounting a router
//If it find this specific route, we want to use the reviewRouter -> So we dont have to do all the implementation ehre as we were doing before
router.use('/:tourId/reviews', reviewRouter);

//////////////////////////////////////////////////////////////

//Specific middleware for a specific route

//This one will run only for the tour route that has the id param
//First the parameter when we want to run, second the middleware f

// router.param('id', tourController.checkID); //Middleware to check if the ID is valid

//Tours routes
//We dont pass the full route path because we have it in the 'parent route' -> the middleware we created (so the / will be the root === the path we passed in the router)
//We can contact the ones with the same route path
router
  .route(`/top-5-cheap`) //This route that makes getting the top 5 easier needs to be before the tours one, because it will find the other one first
  .get(tourController.aliasTopTours, tourController.getAllTours);
router.route(`/tour-stats`).get(tourController.getTourStats);
router
  .route(`/monthly-plan/:year`)
  .get(
    authenticationController.protect,
    authenticationController.restrictTo('admin', 'lead-guide'),
    tourController.getMonthlyPlan,
  );
router
  .route(`/`)
  .get(tourController.getAllTours)
  .post(
    authenticationController.protect,
    authenticationController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  ); //We can add multiple middleware just by putting them between comas
router
  .route(`/:id`)
  .get(tourController.getTour)
  .patch(
    authenticationController.protect,
    authenticationController.restrictTo('admin', 'lead-guide'),
    tourController.updateTour,
  )
  .delete(
    authenticationController.protect,
    authenticationController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
