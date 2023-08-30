const mongoose = require('mongoose');
const dotenv = require('dotenv');
//This saves the enviroment variables into the NODEJS
dotenv.config({ path: './config.env' });

const app = require('./app');

mongoose
  .connect(process.env.DATABASE_ALT, {
    useNewUrlParser: true,
  })
  .then(() => console.log('DB connection succesful!'));

//We start the server here
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port} in ${process.env.NODE_ENV}`);
});

//Its kind of a safety net, all unhandle errors will be handle here (promises, example: DB not being connected)
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  //First - We close the server (to be able to finish all pending request and not do it so abrupt).
  //Second - Inside the callback, it will run after closing the server and shut down the application.
  //Because without our database the application doesnt work.
  server.close(() => process.exit(1));
  //IN REALWORLD INSTEAD OF CLOSING IT, WE WOULD HAVE A SYSTEM THAT REBOOTS THE SYSTEM or SMTH LIKE THAT
});

//We can use the uncaughtException to do the same but with sync errors//
