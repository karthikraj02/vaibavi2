const express = require('express');
const { getUserContext } = require('../controllers/userController');

const router = express.Router();

router.get('/context/:email', getUserContext);

module.exports = router;
