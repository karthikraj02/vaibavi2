const Refund = require('../models/Refund');
const Booking = require('../models/Booking');

// @desc    Request a refund
// @route   POST /api/refunds/request
// @access  Private
const requestRefund = async (req, res) => {
  const { bookingId, reason } = req.body;
  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // Prevent duplicate refunds
    const existingRefund = await Refund.findOne({ booking: bookingId });
    if (existingRefund) return res.status(400).json({ message: 'Refund already requested for this booking' });

    const refund = await Refund.create({
      booking: bookingId,
      user: req.user._id,
      amount: booking.totalAmount,
      reason
    });

    // Optionally update booking status
    booking.status = 'cancelled';
    await booking.save();

    res.status(201).json(refund);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process refund (Admin only)
// @route   PUT /api/refunds/:id/process
// @access  Private/Admin
const processRefund = async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: 'Refund not found' });
    
    refund.status = req.body.status; // 'approved', 'rejected', or 'processed'
    await refund.save();
    
    res.json(refund);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { requestRefund, processRefund };