const express = require('express');
const { updateFlightStatus, getLiveFlightStates } = require('../controllers/trackingController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/live-states', getLiveFlightStates);
router.post('/update-status', protect, admin, updateFlightStatus);

module.exports = router;