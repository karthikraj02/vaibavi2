const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  name: String,
  email: String,
  phone: String,
  dateOfBirth: String,
  gender: String,
  title: String,
  passportNumber: String,
  seatNumber: String,
}, { _id: false });

const flightSnapshotSchema = new mongoose.Schema({
  airline: String,
  flightNumber: String,
  from: String,
  to: String,
  departureAt: String,
  arrivalAt: String,
  duration: String,
  price: Number,
  currency: { type: String, default: 'usd' },
  cabinClass: { type: String, default: 'economy' },
  logo: String,
  departureTerminal: String,
  arrivalTerminal: String,
  departureGate: String,
  arrivalGate: String,
  time: String,
  status: String,
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  flight: { type: mongoose.Schema.Types.ObjectId, ref: 'Flight' },
  flightSnapshot: flightSnapshotSchema,
  passengers: [passengerSchema],
  contactEmail: { type: String },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'usd' },
  cabinClass: { type: String, default: 'economy' },
  status: {
    type: String,
    enum: ['pending', 'payment_processing', 'confirmed', 'cancelled', 'refunded', 'completed', 'failed'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'processing', 'paid', 'failed', 'refunded'],
    default: 'unpaid',
  },
  paymentIntentId: { type: String },
  idempotencyKey: { type: String, unique: true, sparse: true },
  bookingRef: { type: String, unique: true, sparse: true },
  duffelOfferId: { type: String },
  duffelOrderId: { type: String },
  source: { type: String, enum: ['catalog', 'duffel'], default: 'catalog' },
  emailSent: { type: Boolean, default: false },
  emailError: { type: String },
}, { timestamps: true });

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ paymentIntentId: 1 }, { sparse: true });

module.exports = mongoose.model('Booking', bookingSchema);
