import axios from 'axios';
import { showAlert } from './alerts';

export const bookTour = async (tourId) => {
  const stripe = Stripe(
    //public key
    'pk_test_51NpEYKBrV5u4LMuqeLgueZHWKvSZaBxqsDACQ4J6fwaUohKA39oWTTCJv3kcZ6Zm6erHx5g0eBQ2vPxSY0uAZdHS00EM60EyAL',
  );
  try {
    //1) Get the checkout session from the server
    const session = await axios(
      `http://localhost:8000/api/v1/bookings/checkout-session/${tourId}`,
    );
    console.log(session);
    //2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', `Failed to load!`);
  }
};
