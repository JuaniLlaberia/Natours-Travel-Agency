const express = require('express');
const viewController = require('../controllers/viewController');
const authenticationController = require('../controllers/authenticationController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

router.get(
  '/',
  // bookingController.createBookingCheckout, //TEMPORARY (UNTIL WE HAVE WEBHOOKS)
  authenticationController.isLoggedIn,
  viewController.getOverview,
);
router.get(
  '/tour/:slug',
  authenticationController.isLoggedIn,
  viewController.getTour,
);
router.get(
  '/login',
  authenticationController.isLoggedIn,
  viewController.getLoginForm,
);
router.get('/me', authenticationController.protect, viewController.getAccount);
router.get(
  '/my-tours',
  authenticationController.protect,
  viewController.getMyTours,
);

router.post(
  '/submit-user-data',
  authenticationController.protect,
  viewController.updateUserData,
);

module.exports = router;
