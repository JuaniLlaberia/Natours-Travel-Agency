const express = require('express');
const tourController = require('../controllers/tourController');
const authenticationController = require('../controllers/authenticationController');
//Create a new router -> We are creating a 'sub-app' for each resource
//Creating Router
const router = express.Router();

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
router.route(`/monthly-plan/:year`).get(tourController.getMonthlyPlan);
router
  .route(`/`)
  .get(authenticationController.protect, tourController.getAllTours)
  .post(tourController.createTour); //We can add multiple middleware just by putting them between comas
router
  .route(`/:id`)
  .get(tourController.getTour)
  .patch(tourController.updateTour)
  .delete(
    authenticationController.protect,
    authenticationController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
