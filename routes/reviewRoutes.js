const express = require('express');
const reviewController = require('../controllers/reviewController');
const authenticationController = require('../controllers/authenticationController');

//We are merging the params in order to have access to parameters from another route, so we can have access
//to the tour id route that we need to create a new review and it was stored in the URL when we called the /tour/id/reviews
const router = express.Router({ mergeParams: true });

router.use(authenticationController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authenticationController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .delete(
    authenticationController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  )
  .patch(
    authenticationController.restrictTo('user', 'admin'),
    authenticationController.checkIfUser,
    reviewController.markAsEdited,
    reviewController.updateReview,
  );

module.exports = router;
