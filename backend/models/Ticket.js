const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  pnr: { type: String, required: true, unique: true },
  ticketNumber: { type: String, required: true, unique: true },
  qrCodeUrl: { type: String },
  pdfUrl: { type: String },
  status: { type: String, enum: ['issued', 'checked_in', 'boarded', 'used', 'cancelled'], default: 'issued' }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);