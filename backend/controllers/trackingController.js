const Flight = require('../models/Flight');

// @desc    Update Flight Status & Emit via Socket
// @route   POST /api/tracking/update-status
// @access  Private/Admin
const updateFlightStatus = async (req, res) => {
  const { flightId, status } = req.body;
  try {
    const flight = await Flight.findById(flightId);
    if (!flight) return res.status(404).json({ message: 'Flight not found' });
    
    flight.status = status;
    await flight.save();
    
    // Emit real-time update to all connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('flight_update', { flightId, status, airline: flight.airline, flightNumber: flight.flightNumber });
    }
    
    res.json(flight);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { updateFlightStatus };