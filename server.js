const dotenv = require('dotenv');
//This saves the enviroment variables into the NODEJS
dotenv.config({ path: './config.env' });

const app = require('./app');

//We start the server here
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}`);
});
