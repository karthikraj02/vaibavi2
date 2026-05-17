const express = require('express');
const { requestRefund, processRefund } = require('../controllers/refundController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/request', protect, requestRefund);
router.put('/:id/process', protect, admin, processRefund);

module.exports = router;