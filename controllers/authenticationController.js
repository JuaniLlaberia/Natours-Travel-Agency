/* eslint-disable import/no-extraneous-dependencies */
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

//Creating the jwt for authentication
//PAYLOAD - SECRET - TOKEN HEADER(automatically) - OPTIONS
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: Date.now(),
  });

  //Creating token
  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    //We send the token to log in. We dont perform verificaiton here because the user was just created
    token,
    data: {
      user: newUser,
    },
  });
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
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
  });
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
  next();
});
