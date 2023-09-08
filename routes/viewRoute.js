const express = require('express');
const viewController = require('../controllers/viewController');
const authenticationController = require('../controllers/authenticationController');
const router = express.Router();

router.get('/', viewController.getOverview);
router.get(
  '/tour/:slug',
  authenticationController.protect,
  viewController.getTour,
);
router.get('/login', viewController.getLoginForm);

module.exports = router;
