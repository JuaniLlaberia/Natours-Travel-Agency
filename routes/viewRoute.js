const express = require('express');
const viewController = require('../controllers/viewController');
const authenticationController = require('../controllers/authenticationController');

const router = express.Router();

router.get(
  '/',
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

router.post(
  '/submit-user-data',
  authenticationController.protect,
  viewController.updateUserData,
);

module.exports = router;
