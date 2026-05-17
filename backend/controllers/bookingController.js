const crypto = require('crypto');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const { getStripe } = require('../utils/config');
const { sendBookingConfirmation } = require('../services/bookingEmailService');

const generateBookingRef = () =>
  `FA-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

const generateSeat = () =>
  `${Math.floor(Math.random() * 30) + 1}${['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(Math.random() * 6)]}`;

const finalizeBooking = async (booking, { seat } = {}) => {
  const flight = booking.flightSnapshot || {};
  const passenger = booking.passengers?.[0] || {};
  const passengerName = passenger.name || `${passenger.firstName || ''} ${passenger.lastName || ''}`.trim();
  const assignedSeat = seat || passenger.seatNumber || generateSeat();

  const ticket = await Ticket.create({
    booking: booking._id,
    pnr: booking.bookingRef,
    ticketNumber: crypto.randomBytes(6).toString('hex').toUpperCase(),
    status: 'issued',
  });

  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  await booking.save();

  let emailResult = { success: false };
  const contactEmail = booking.contactEmail || passenger.email;
  if (contactEmail) {
    try {
      emailResult = await sendBookingConfirmation({
        toEmail: contactEmail,
        passengerName,
        bookingRef: booking.bookingRef,
        flight,
        seat: assignedSeat,
        departureDate: flight.departureAt || new Date().toLocaleDateString('en-US'),
        totalAmount: booking.totalAmount,
        currency: booking.currency,
      });
      booking.emailSent = emailResult.success;
      await booking.save();
    } catch (err) {
      booking.emailError = err.message;
      await booking.save();
    }
  }

  return { booking, ticket, emailResult, seat: assignedSeat };
};

// @route POST /api/bookings/create-payment-intent
const createPaymentIntent = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured' });
  }

  const { amount, currency = 'usd', flightSnapshot, passengers, contactEmail, idempotencyKey } = req.body;

  if (!amount || amount < 50) {
    return res.status(400).json({ message: 'Valid amount (cents) is required' });
  }
  if (!passengers?.length || !contactEmail) {
    return res.status(400).json({ message: 'passengers and contactEmail are required' });
  }

  const key = idempotencyKey || `pi-${req.user._id}-${Date.now()}`;

  const existing = await Booking.findOne({ idempotencyKey: key, user: req.user._id });
  if (existing?.paymentIntentId && existing.paymentStatus === 'paid') {
    return res.status(409).json({ message: 'Booking already paid', bookingId: existing._id });
  }

  let booking = existing;
  if (!booking) {
    booking = await Booking.create({
      user: req.user._id,
      flightSnapshot,
      passengers,
      contactEmail,
      totalAmount: amount / 100,
      currency,
      status: 'pending',
      paymentStatus: 'unpaid',
      idempotencyKey: key,
      bookingRef: generateBookingRef(),
      source: flightSnapshot?.duffelOfferId ? 'duffel' : 'catalog',
      duffelOfferId: flightSnapshot?.duffelOfferId,
    });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount),
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          bookingId: String(booking._id),
          userId: String(req.user._id),
          bookingRef: booking.bookingRef,
        },
      },
      { idempotencyKey: `stripe-${key}` }
    );

    booking.paymentIntentId = paymentIntent.id;
    booking.status = 'payment_processing';
    booking.paymentStatus = 'processing';
    await booking.save();

    res.json({
      clientSecret: paymentIntent.client_secret,
      bookingId: booking._id,
      bookingRef: booking.bookingRef,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/bookings/confirm
const confirmBookingPayment = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ message: 'Stripe is not configured' });
  }

  const { paymentIntentId, bookingId } = req.body;
  if (!paymentIntentId) {
    return res.status(400).json({ message: 'paymentIntentId is required' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: `Payment not completed (status: ${paymentIntent.status})` });
    }

    const booking = await Booking.findOne({
      _id: bookingId || paymentIntent.metadata?.bookingId,
      user: req.user._id,
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.paymentStatus === 'paid') {
      const ticket = await Ticket.findOne({ booking: booking._id });
      return res.json({ success: true, booking, ticket, alreadyConfirmed: true });
    }

    const result = await finalizeBooking(booking);
    res.json({
      success: true,
      booking: result.booking,
      ticket: result.ticket,
      seat: result.seat,
      emailSent: result.emailResult.success,
      etherealUrl: result.emailResult.etherealUrl,
      emailFailed: !result.emailResult.success,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/bookings
const createBooking = async (req, res) => {
  const { flightSnapshot, passengers, totalAmount, contactEmail, paymentIntentId } = req.body;

  try {
    const booking = await Booking.create({
      user: req.user._id,
      flightSnapshot,
      passengers,
      contactEmail,
      totalAmount,
      paymentIntentId,
      bookingRef: generateBookingRef(),
      status: paymentIntentId ? 'payment_processing' : 'confirmed',
      paymentStatus: paymentIntentId ? 'processing' : 'paid',
    });

    if (!paymentIntentId) {
      const result = await finalizeBooking(booking);
      return res.status(201).json({ booking: result.booking, ticket: result.ticket });
    }

    res.status(201).json({ booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/bookings/:id
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const ticket = await Ticket.findOne({ booking: booking._id });
    res.json({ success: true, booking, ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/bookings
const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Used by Stripe webhook
exports.handlePaymentSucceeded = async (paymentIntent) => {
  const booking = await Booking.findById(paymentIntent.metadata?.bookingId);
  if (!booking || booking.paymentStatus === 'paid') return booking;

  booking.paymentIntentId = paymentIntent.id;
  await finalizeBooking(booking);
  return booking;
};

module.exports = {
  createPaymentIntent,
  confirmBookingPayment,
  createBooking,
  getUserBookings,
  getBookingById,
  finalizeBooking,
};
