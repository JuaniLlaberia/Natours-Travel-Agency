const express = require('express');
const userController = require('../controllers/userController');
const authenticationController = require('../controllers/authenticationController');

//Router
const router = express.Router();

//User routes
//The signup endpoint is to create user or guide accounts(as it doesnt need auth) NOT LEAD OR ADMIN
router.post('/signup', authenticationController.signup);
router.post('/login', authenticationController.login);
router.get('/logout', authenticationController.logout);
router.post('/forgotPassword', authenticationController.forgotPassword);
router.patch('/resetPassword/:token', authenticationController.resetPassword);

//We can implement middleware to the router (this specific router). For example to protect all routes after the middleware and not having to do it manually on each
//This works because all of this is middleware so they go in a sequence
router.use(authenticationController.protect); //Adds logged in user to the req
//After the above middleware -> ALL ROUTES ARE PROTECTED (just auth users)

router.get('/me', userController.getMe, userController.getUser);

router.patch('/updateMyPassword', authenticationController.updatePassword);

router.patch('/updateMe', userController.updateMe);

router.delete('/deleteMe', userController.deleteMe);

//Just admins can perform the actions below (for protection)
router.use(authenticationController.restrictTo('admin'));

router
  .route(`/`)
  .get(userController.getAllUsers)
  //This route is to create admins/lead-guide accounts as they need to be created by an admin
  .post(userController.createUser);
router
  .route(`/:id`)
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
