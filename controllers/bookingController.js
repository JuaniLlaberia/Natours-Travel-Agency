const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); //It exposes a function that we autmatically call it with the key to have acccess to the object
const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const User = require('../models/userModel');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  //1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourID);

  //2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    //OLD IMPLEMENTATION BEFORE WEBHOOKS
    // success_url: `${req.protocol}://${req.get('host')}/?tour=${
    //   req.params.tourID
    // }&user=${req.user.id}&price=${tour.price}`,

    //NEW IMPLEMENTATION WITH WEBHOOKS
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourID, //We set the id here to then use in the webhook
    line_items: [
      {
        price_data: {
          unit_amount: tour.price * 100,
          currency: 'usd',
          product_data: {
            name: `${tour.name} Tour`,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
            description: tour.summary,
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
  });

  //3) Create session and send to client
  res.status(200).json({
    status: 'success',
    session,
  });
});

///OLD IMPLEMENTATION WITHOUT WEBHOOKS
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   //TEMPORARY UNTIL WE HAVE WEBHOOKS
//   const { tour, user, price } = req.query;
//   if (!tour && !user && !price) return next();

//   await Booking.create({ tour, user, price });

//   res.redirect(req.originalUrl.split('?')[0]);
// });

const createBookingCheckout = catchAsync(async (session) => {
  //The data is stored in the session
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.line_items[0].amount / 100;

  await Booking.create({ tour, user, price });
});

//THIS WIILL RUN WHENEVER A PAYMENT WAS SUCCESSFULL
exports.webhookCheckout = (req, res, next) => {
  //1) Read STRIPE SIGNATURE
  const signature = req.headers['stripe-signature'];
  //2) Create stripe event (All of this to validate the data that comes in the body (SECURE))
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  //Check if the event is the one we need
  if (event.type === 'checkout.session.complete')
    createBookingCheckout(event.data.object); //We pass the session we create at the beggining of the checkout process

  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.getOneBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
