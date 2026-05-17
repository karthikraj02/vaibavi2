const express = require('express');
const { updateFlightStatus } = require('../controllers/trackingController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/update-status', protect, admin, updateFlightStatus);

module.exports = router;