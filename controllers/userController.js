const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

//Users handlers

exports.getMe = (req, res, next) => {
  //We are setting the params id to the logged user id. So that the current logged in user
  //can fetch its own information just with this route, without having to pass any id or data.
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1) Create an error if user tries to update password
  if (req.body.password || req.body.passwordConfirm)
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400,
      ),
    );
  //2) Filter out unwanted fields that are not allow to be updated(SECURITY)
  //This is to prevent users to be able to update the role for example
  const filteredBody = filterObj(req.body, 'name', 'email');

  //3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  //By setting the active property to false, we make the account innactive
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

//This is to create any type of user (as its only for admins to access) => They can create other admins or lead-guides
//This is a quick way to avoid anyone being able to create admin or high rank roles and do malicious things
exports.createUser = catchAsync(async (req, res) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: Date.now(),
    role: req.body.role,
  });

  res.status(200).json({
    status: 'success',
    message: 'Login to start using this new user',
    data: {
      newUser,
    },
  });
});

//Factory functions
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User); //Not for changing password
exports.deleteUser = factory.deleteOne(User);
