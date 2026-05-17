const express = require('express');
const {
  createPaymentIntent,
  confirmBookingPayment,
  createBooking,
  getUserBookings,
  getBookingById,
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create-payment-intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmBookingPayment);
router.post('/', protect, createBooking);
router.get('/', protect, getUserBookings);
router.get('/:id', protect, getBookingById);

module.exports = router;
