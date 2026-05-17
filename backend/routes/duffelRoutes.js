const express = require('express');
const {
  searchFlights,
  getOffer,
  createOrder,
  getOrder,
} = require('../controllers/duffelController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/search', searchFlights);
router.get('/offers/:offerId', getOffer);
router.post('/orders', protect, createOrder);
router.get('/orders/:orderId', protect, getOrder);

module.exports = router;
