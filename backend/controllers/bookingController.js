const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const crypto = require('crypto');

// @desc    Create Stripe Payment Intent
// @route   POST /api/bookings/create-payment-intent
// @access  Private
const createPaymentIntent = async (req, res) => {
  const { amount } = req.body; // Amount in cents
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Booking & Generate Ticket
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
  const { flightId, passengers, totalAmount, paymentIntentId } = req.body;
  try {
    const booking = await Booking.create({
      user: req.user._id,
      flight: flightId,
      passengers,
      totalAmount,
      paymentIntentId,
      status: 'confirmed'
    });

    // Generate Ticket
    const ticket = await Ticket.create({
      booking: booking._id,
      pnr: crypto.randomBytes(3).toString('hex').toUpperCase(),
      ticketNumber: crypto.randomBytes(6).toString('hex').toUpperCase(),
      status: 'issued'
    });

    res.status(201).json({ booking, ticket });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get User Bookings
// @route   GET /api/bookings
// @access  Private
const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('flight')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createPaymentIntent, createBooking, getUserBookings };