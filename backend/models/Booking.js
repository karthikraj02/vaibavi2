const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight', required: true },
  passengers: [{
    firstName: String,
    lastName: String,
    passportNumber: String,
    seatNumber: String
  }],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'refunded', 'completed'], default: 'pending' },
  paymentIntentId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);