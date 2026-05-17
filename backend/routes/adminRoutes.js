const express = require('express');
const router = express.Router();
const admin = require('../controllers/adminController');
const { protectAdmin } = require('../middleware/authMiddleware');

router.post('/login', admin.adminLogin);

router.post('/flight', protectAdmin, admin.addFlight);
router.get('/flights', protectAdmin, admin.getFlights);
router.put('/flight/:id', protectAdmin, admin.editFlight);
router.delete('/flight/:id', protectAdmin, admin.deleteFlight);

router.get('/bookings', protectAdmin, admin.getBookings);

module.exports = router;