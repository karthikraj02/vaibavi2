const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  reason: { 
    type: String, 
    enum: ['passenger_request', 'flight_cancelled', 'delayed', 'medical_emergency', 'duplicate_booking'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'processed'], 
    default: 'pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Refund', refundSchema);