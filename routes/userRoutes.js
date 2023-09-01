const express = require('express');
const userController = require('../controllers/userController');
const authenticationController = require('../controllers/authenticationController');

//Router
const router = express.Router();

//User routes
router.post('/signup', authenticationController.signup);
router.post('/login', authenticationController.login);

router
  .route(`/`)
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route(`/:id`)
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
