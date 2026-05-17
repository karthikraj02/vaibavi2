const express = require('express');
const { createPaymentIntent, createBooking, getUserBookings } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/create-payment-intent', protect, createPaymentIntent);
router.post('/', protect, createBooking);
router.get('/', protect, getUserBookings);

module.exports = router;