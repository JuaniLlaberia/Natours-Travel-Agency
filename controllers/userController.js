/* eslint-disable import/no-extraneous-dependencies */
const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// //MULTER => is a package to handle file uploads
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // user-ID-timestamp.jpeg
//     const extention = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${extention}`);
//   },
// });

//We store the image in memory so then we can read it in a more efficient way when performing optimization and resizing
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  //Check if the file is an image or not
  if (file.mimetype.startsWith('image')) {
    cb(null, true); //The null means no error
  } else {
    cb(new AppError('Not an image. Please upload an image', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

//We create the middleware that allow us to upload images(locally)
exports.updateUserPhoto = upload.single('photo');

//middleware to resize and ajust the IMG to the website needs
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  //We need to redefine it
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  //Here we get access to the image stored in memory
  //IMG OPTIMIZATION
  await sharp(req.file.buffer)
    .resize(500, 500) //resize image (pixels)
    .toFormat('jpeg') //Select format
    .jpeg({ quality: 90 }) //modify quality
    //This writes the file to the provided place => LEARN HOW TO DO IT TO A CLOUD SERVICE (Not to store it locally)
    .toFile(`public/img/users/${req.file.filename}`);

  //Also we should implement a system as we did in supabase/firebase to remove the old image if the user is updating the image to a new one

  next();
});

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
  if (req.file) filteredBody.photo = req.file.filename;

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
