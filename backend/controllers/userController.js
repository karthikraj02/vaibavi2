const Booking = require('../models/Booking');

exports.getUserContext = async (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const userProfile = {
            email: email,
            name: email.split('@')[0]
        };

        const bookings = await Booking.find({ contactEmail: email })
            .populate('flight')
            .sort({ createdAt: -1 });
        const savedPassengersMap = new Map();
        
        bookings.forEach(booking => {
            booking.passengers.forEach(p => {
                const uniqueKey = p.passportNumber || p.email;
                if (!savedPassengersMap.has(uniqueKey) && !p.isCancelled) {
                    savedPassengersMap.set(uniqueKey, {
                        name: p.name,
                        email: p.email,
                        passportNumber: p.passportNumber,
                        dateOfBirth: p.dateOfBirth,
                        nationality: p.nationality,
                        phoneNumber: p.phoneNumber
                    });
                }
            });
        });

        const savedPassengers = Array.from(savedPassengersMap.values());

        const now = new Date();
        const upcomingBookings = [];
        const pastBookings = [];

        bookings.forEach(b => {
            if (b.flight && b.flight.departureDate > now && b.bookingStatus !== 'Cancelled') {
                upcomingBookings.push(b);
            } else {
                pastBookings.push(b);
            }
        });

        res.status(200).json({
            success: true,
            user: userProfile,
            savedPassengers,
            bookings: {
                total: bookings.length,
                upcoming: upcomingBookings,
                past: pastBookings
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
