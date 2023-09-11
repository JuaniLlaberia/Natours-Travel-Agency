/* eslint-disable */
import 'core-js';
import 'regenerator-runtime';

import { login, logout } from './login';
import { updateSettings } from './updateSettings';

//DOM ELEMENTS
const loginForm = document.querySelector('.form--login');
const updateSettingsUserForm = document.querySelector('.form-user-data');
const updatePasswordUserForm = document.querySelector('.form-user-password');
const logoutBtn = document.querySelector('.nav__el--logout');

//DELEGATION
if (loginForm) {
  const loginSubmit = loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    login(email, password);
  });

  loginForm.removeEventListener('submit', loginSubmit);
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

if (updateSettingsUserForm) {
  updateSettingsUserForm.addEventListener('submit', (e) => {
    e.preventDefault();

    //Getting the image from the front end to the server
    //We are recreating the multipart form data
    const form = new FormData();
    form.append('name', document.getElementById('name').value);
    form.append('email', document.getElementById('email').value);
    form.append('photo', document.getElementById('photo').files[0]);

    console.log(form);

    updateSettings(form, 'data');
  });
}

if (updatePasswordUserForm) {
  updatePasswordUserForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelector('.btn--save-password').textContent = 'Updating...';

    const passwordCurrent = document.getElementById('password-current').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;

    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      'password',
    );

    document.querySelector('.btn--save-password').textContent = 'Save password';
    document.getElementById('password-current').value = '';
    document.getElementById('password').value = '';
    document.getElementById('password-confirm').value = '';
  });
}
