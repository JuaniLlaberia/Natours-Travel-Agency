const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
// eslint-disable-next-line import/no-extraneous-dependencies
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    require: [true, 'This field is mandatory'],
    minLength: [5, 'The name must have at least 5 characters'],
    maxLength: [40, 'The name must have under 40 characters'],
  },
  email: {
    type: String,
    require: [true, 'This field is mandatory'],
    unique: true,
    lowercase: true,
    //Validate email format
    validate: [validator.isEmail, 'Pleaser enter a valid email address'],
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  photo: String,
  password: {
    type: String,
    require: [true, 'This field is required'],
    minLength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    require: [true, 'Confirm your password'],
    validate: {
      //Only works on save and create!
      validator: function (val) {
        return val === this.password;
      },
      message: 'Passwords must match',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//Mongoose middleware (To encrypt passwords)
userSchema.pre('save', async function (next) {
  //Checking if the password was not modified -> So if it was not modified it should already be encrypted from when it was created
  if (!this.isModified('password')) return next();

  //Hashing/Encrypting the password
  this.password = await bcrypt.hash(this.password, 12); //first the password and the second it the intensity (bigger number takes more time to process but more secure hashing)
  //We delete it because we dont need it at the database
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function (next) {
  //Build in methods to check if the password was modified and to cehck is its a new documents
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; //We subtract 1sec in order to ensure that the token is created after the password has been changed
  next();
});

//Query middleware to filter the users that are inavtive (not retrieve them)
userSchema.pre(/^find/, function (next) {
  //this points to the current query
  this.find({ active: { $ne: false } });

  next();
});

//Instance method (available in all documents of a certain collection)
//So in the auth controller we will have access to it.
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  //Compares the inputed password with the user stored password
  return await bcrypt.compare(candidatePassword, userPassword); //Returns true or false
};

//We want to check if the password has been changed before the token expired (so someone is trying to acces with an old code when the passwords has been changed => They need to log in again)
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    //The passwordChangedAt is in a diff format, so we need to fix it (first to get the seconds, then transform it into ms)
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }

  //False means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  //Reset token => random string
  const resetToken = crypto.randomBytes(32).toString('hex');

  //Encrypting the token and storing it in the user(We need it there to compare it when the new password arrives)
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  //We need to set an expiration time for security (in this case 10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
