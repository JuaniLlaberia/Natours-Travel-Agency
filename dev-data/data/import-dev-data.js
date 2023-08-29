const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
//This saves the enviroment variables into the NODEJS
dotenv.config({ path: './config.env' });
const Tour = require('./../../models/tourModel');

mongoose
  .connect(process.env.DATABASE_ALT, {
    useNewUrlParser: true,
  })
  .then(() => console.log('DB connection succesful!'));

//READ JSON FILE
const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/tours-simple.json`, `utf-8`),
);

//IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Tour.create(tours);
    console.log('All data loaded from local to the DB');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

//DELETE ALL DATA FROM COLLECTION
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    console.log('Data deleted!');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
