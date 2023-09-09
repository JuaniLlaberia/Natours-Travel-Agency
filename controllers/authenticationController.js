/* eslint-disable import/no-extraneous-dependencies */
const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');
const Review = require('../models/reviewModel');

//Creating the jwt for authentication
//PAYLOAD - SECRET - TOKEN HEADER(automatically) - OPTIONS
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ), //When is the cookie expiring
    httpOnly: true, //The cookie cant be access or modified by the browser
    //The browser will just receive it and send it along with every request
  };

  //Creating a cookie to store the token
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true; //Make it secure (Just in HTTPS)
  res.cookie('jwt', token, cookieOptions);

  user.password = undefined; //Remove the password from the output

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

//Checking if the user trying to update the review is the one who created it or its an admin
exports.checkIfUser = async (req, res, next) => {
  const review = await Review.findById(req.params.id);
  if (req.user.role !== 'admin' && review.user.id !== req.user.id)
    return next(
      new AppError('You are only allow to edit your own reviews', 403),
    );
  next();
};

//This is just for signing up users as it doesnt need auth
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: Date.now(),
    role: req.body.role === 'guide' ? 'guide' : 'user',
  });

  //Creating token
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //2) Check if user exists && password is correct
  const user = await User.findOne({ email: email }).select('+password'); //We use the + because the password is not selected by default

  //We use the bcrypt to compare the sent one and the stored one (implemented in the model with instance methods -> we have access here)
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //3) If everything is ok, send a token to client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting token and check if its there
  let token; //JWT TOKEN
  //The HTTP headers contains if passed the authorization token and we can check it
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ').at(1);
  } else if (req.cookies.jwt) {
    //Authenticating users by tokens send by cookies
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in. Please log in to get access.', 401),
    );
  }
  //2) Verification: Valdiate token (JWT checks if signature is valid or not)
  //This transforms it into a promise and them we call it, in order to have a promise we can await
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) Check if user still exists
  const crrUser = await User.findById(decoded.id);
  if (!crrUser) {
    return next(
      new AppError(
        'The user belonging to this token does not exist anymore',
        401,
      ),
    );
  }

  //4) Check if user changed token after the JWT was issued
  //Basically if the user changed the password and the old token hasnt exipre, it will throw and error in order to indicate that the token must be updated (log in agains)
  if (crrUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password. Log in again.', 401),
    );
  }

  //If all the validation goes OK. We grant access to the protected route :D
  req.user = crrUser;
  res.locals.user = crrUser; //Allow us to use it on the templates
  next();
});

//We need to create a wrapper function in order to access the parameters we pass in the middleware function
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    //roles = Array
    //We have access to the user because we stored it in the request in previous middleware (protect)
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on Posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is not user with that email', 404));
  }

  //2) Generate random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //We need this because everytime we save the validators run (so we need to skip it in this case)

  //3) Send an email back -> Node Mailer
  const resetURL = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}. \n If you did not forget your password, please ignore this message`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset (Expires in 10 min.)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    //If there is an error we want to reset the reset token
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error send the email. Please try again later!',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on the token
  //In this case we are able to hash it and compare it easier than with the passwords in login, because here we didnt use a complex algo to hash it
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    //Cheking if the token has not yet expired
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) Set new password if token has not expire and the user does exist
  if (!user) return next(new AppError('Token is invalid or has expired', 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save(); //Here we dont turn off the validators because we want to validate the passwords

  //3) Update changedPasswordAt for the crrUser => DONE IN MIDDLEWARE

  //4) Log the user in, send the JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //ONLY FOR LOGGED IN USERS
  //1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  //2) Check if posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  //3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); //Validation happends on the schema as always
  //We didnt use the findByIdAndUpdate because the validor wont run. (ONLY WITH CREATE AND SAVE) And also
  //the middle wares for password wont run.

  //4) Log user in, send JWT
  createSendToken(user, 200, res);
});

//For render pages (to check if the user is logged in and conditionally render some stuff)
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  //The request contains the cookies and inside that we may have the auth jwt token
  //1) Check if there is a token
  if (req.cookies.jwt) {
    //2) Verification: Valdiate token (JWT checks if signature is valid or not)
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET,
    );

    //3) Check if user still exists
    const crrUser = await User.findById(decoded.id);
    if (!crrUser) {
      return next();
    }

    //4) Check if user changed token after the JWT was issued
    if (crrUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    //There is a logged in user
    //The pug template will have access to this variable
    res.locals.user = crrUser;
    return next();
  }
  next();
});

exports.logout = (req, res) => {
  //We overwrite the cookie containing the token and we dont send the token as in the login
  res.cookie('jwt', 'null', {
    expires: new Date(Date.now() - 10 * 1000),
    httpOnly: true,
  }); //So now the cookie is expire and null => The user is not authenticated and we can login again

  res.status(200).json({
    status: 'success',
  });
};
