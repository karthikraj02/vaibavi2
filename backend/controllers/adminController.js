const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const jwt = require('jsonwebtoken');

// ADMIN LOGIN
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1d' });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ADD FLIGHT
exports.addFlight = async (req, res) => {
  try {
    const flight = new Flight(req.body);
    await flight.save();

    res.json({ success: true, flight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL FLIGHTS
exports.getFlights = async (req, res) => {
  try {
    const flights = await Flight.find();
    res.json({ success: true, flights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE FLIGHT
exports.deleteFlight = async (req, res) => {
  try {
    await Flight.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Flight deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// EDIT FLIGHT
exports.editFlight = async (req, res) => {
  try {
    const flight = await Flight.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, flight });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// VIEW BOOKINGS
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate("flight").sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};