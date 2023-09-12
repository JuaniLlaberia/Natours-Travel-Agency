import axios from 'axios';
import { showAlert } from './alerts';

/* eslint-disable import/prefer-default-export */
//Type is either 'password' or 'data'
export const updateSettings = async (data, type) => {
  try {
    const res = await axios({
      method: 'PATCH',
      url:
        type === 'password'
          ? '/api/v1/users/updateMyPassword'
          : '/api/v1/users/updateMe',
      data,
    });

    if (res.data.status === 'success') {
      showAlert('success', 'Updated successfully');
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
