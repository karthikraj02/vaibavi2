// Duffel API integration for flight search and booking
// Install dependencies: npm install express axios dotenv

const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const DUFFEL_ACCESS_TOKEN = process.env.DUFFEL_ACCESS_TOKEN;

// Search for flights
app.post('/api/flight-search', async (req, res) => {
  const { origin, destination, departure_date } = req.body;
  try {
    const response = await axios.post(
      'https://api.duffel.com/air/offer_requests',
      {
        slices: [
          { origin, destination, departure_date }
        ],
        passengers: [{ type: 'adult' }],
        cabin_class: 'economy'
      },
      {
        headers: {
          Authorization: `Bearer ${DUFFEL_ACCESS_TOKEN}`,
          'Duffel-Version': 'beta',
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TODO: Implement /api/flight-book endpoint for booking

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Duffel flights API running on port ${PORT}`));
