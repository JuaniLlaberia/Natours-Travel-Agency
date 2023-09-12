/* eslint-disable*/
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: `/api/v1/users/login`, //Relative URL -> as the api and the web are hosted together, this works
      data: {
        email,
        password,
      },
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Logged in successfully');

      window.setTimeout(() => {
        location.assign('/');
      }, 1000);
    }
  } catch (err) {
    console.log(err);
    // eslint-disable-next-line no-alert
    showAlert('error', err.message);
  }
};

export const logout = async () => {
  try {
    //We fetch that endpoint to logout the crr user
    const res = await axios({
      method: 'GET',
      url: '/api/v1/users/logout',
    });
    if (res.data.status === 'success') {
      //We reload the page
      location.reload(true); //true will force a serve reaload and not from the browser cache
      //Show alert for success
      showAlert('success', 'Logged out successfully');
    }
  } catch (err) {
    //Show alert for error
    showAlert('error', err.message);
  }
};
