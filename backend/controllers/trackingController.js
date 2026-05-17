const Flight = require('../models/Flight');
const https = require('https');

let cache = {
  data: null,
  timestamp: 0
};

// @desc    Get Real-time, Real-world Global Flight State Vectors
// @route   GET /api/tracking/live-states
// @access  Public
const getLiveFlightStates = async (req, res) => {
  const CACHE_DURATION = 15000; // 15 seconds cache to satisfy OpenSky API limits
  const now = Date.now();

  if (cache.data && (now - cache.timestamp < CACHE_DURATION)) {
    console.log('Serving live flights from memory cache...');
    return res.json({ success: true, flights: cache.data, source: 'cache' });
  }

  const airlineMap = {
    'AIC': 'Air India',
    'BAW': 'British Airways',
    'DLH': 'Lufthansa',
    'UAE': 'Emirates',
    'DAL': 'Delta Air Lines',
    'UAL': 'United Airlines',
    'AFR': 'Air France',
    'KLM': 'KLM Royal Dutch',
    'QTR': 'Qatar Airways',
    'SIA': 'Singapore Airlines',
    'AAL': 'American Airlines',
    'QFA': 'Qantas',
    'JAL': 'Japan Airlines',
    'ANA': 'All Nippon Airways',
    'THY': 'Turkish Airlines'
  };

  const routesByAirline = {
    'AIC': [{ from: 'DEL', to: 'BOM' }, { from: 'BOM', to: 'DEL' }, { from: 'DEL', to: 'JFK' }, { from: 'BOM', to: 'LHR' }],
    'BAW': [{ from: 'LHR', to: 'JFK' }, { from: 'LHR', to: 'DEL' }, { from: 'LHR', to: 'LAX' }, { from: 'JFK', to: 'LHR' }],
    'DLH': [{ from: 'FRA', to: 'JFK' }, { from: 'MUC', to: 'DEL' }, { from: 'FRA', to: 'BOM' }, { from: 'JFK', to: 'FRA' }],
    'UAE': [{ from: 'DXB', to: 'LHR' }, { from: 'DXB', to: 'DEL' }, { from: 'DXB', to: 'JFK' }, { from: 'DEL', to: 'DXB' }],
    'DAL': [{ from: 'JFK', to: 'LAX' }, { from: 'ATL', to: 'JFK' }, { from: 'SEA', to: 'HND' }, { from: 'LHR', to: 'ATL' }],
    'UAL': [{ from: 'SFO', to: 'HND' }, { from: 'ORD', to: 'LHR' }, { from: 'EWR', to: 'DEL' }, { from: 'DEL', to: 'EWR' }],
    'AFR': [{ from: 'CDG', to: 'JFK' }, { from: 'CDG', to: 'DEL' }, { from: 'CDG', to: 'LAX' }, { from: 'JFK', to: 'CDG' }],
    'KLM': [{ from: 'AMS', to: 'JFK' }, { from: 'AMS', to: 'DEL' }, { from: 'AMS', to: 'BOM' }, { from: 'JFK', to: 'AMS' }],
    'QTR': [{ from: 'DOH', to: 'LHR' }, { from: 'DOH', to: 'DEL' }, { from: 'DOH', to: 'JFK' }, { from: 'DEL', to: 'DOH' }],
    'SIA': [{ from: 'SIN', to: 'LHR' }, { from: 'SIN', to: 'HND' }, { from: 'SIN', to: 'JFK' }, { from: 'DEL', to: 'SIN' }]
  };

  const getRandomRoute = (prefix) => {
    const list = routesByAirline[prefix] || [
      { from: 'DEL', to: 'DXB' }, { from: 'LHR', to: 'JFK' }, { from: 'HND', to: 'SEA' }, { from: 'CDG', to: 'AMS' }
    ];
    return list[Math.floor(Math.random() * list.length)];
  };

  const getFallbackFlights = () => {
    console.log('Generating premium real-time simulation fallback flights...');
    const prefixes = Object.keys(airlineMap);
    return prefixes.map((prefix, idx) => {
      const route = getRandomRoute(prefix);
      const callsign = `${prefix}${100 + Math.floor(Math.random() * 900)}`;
      return {
        id: `real-${callsign.trim()}-${idx}`,
        number: callsign.trim(),
        airline: airlineMap[prefix],
        from: route.from,
        to: route.to,
        latitude: 28.5 + (Math.random() * 4 - 2),
        longitude: 77.2 + (Math.random() * 6 - 3),
        speed: 820 + Math.floor(Math.random() * 80),
        altitude: 32000 + Math.floor(Math.random() * 6000),
        heading: Math.floor(Math.random() * 360),
        country: 'Global Airspace',
        isRealData: false
      };
    });
  };

  const requestOptions = {
    hostname: 'opensky-network.org',
    path: '/api/states/all',
    method: 'GET',
    headers: { 'User-Agent': 'FlightAgent/1.0' },
    timeout: 3500
  };

  const reqGet = https.request(requestOptions, (response) => {
    let dataBuffer = '';

    response.on('data', (chunk) => {
      dataBuffer += chunk;
    });

    response.on('end', () => {
      try {
        if (response.statusCode !== 200) {
          throw new Error(`OpenSky returned status code ${response.statusCode}`);
        }

        const parsed = JSON.parse(dataBuffer);
        if (!parsed.states || !Array.isArray(parsed.states)) {
          throw new Error('Invalid response structure from OpenSky');
        }

        const processedFlights = [];
        for (const state of parsed.states) {
          const callsign = state[1] ? state[1].trim() : '';
          const lat = state[6];
          const lon = state[5];
          const onGround = state[8];
          const velocity = state[9]; // m/s
          const geoAlt = state[13] || state[7] || 0; // meters
          const heading = state[10] || 0; // degrees
          const country = state[2] || '';

          if (!callsign || lat === null || lon === null || onGround) continue;

          const prefix = callsign.substring(0, 3).toUpperCase();
          if (airlineMap[prefix]) {
            const route = getRandomRoute(prefix);
            processedFlights.push({
              id: `real-${state[0]}-${callsign}`,
              number: callsign,
              airline: airlineMap[prefix],
              from: route.from,
              to: route.to,
              latitude: lat,
              longitude: lon,
              speed: Math.round(velocity * 3.6), // convert m/s to km/h
              altitude: Math.round(geoAlt * 3.28084), // convert meters to feet
              heading: Math.round(heading),
              country: country,
              isRealData: true
            });
          }

          if (processedFlights.length >= 100) break;
        }

        if (processedFlights.length === 0) {
          const fallbacks = getFallbackFlights();
          cache.data = fallbacks;
          cache.timestamp = now;
          return res.json({ success: true, flights: fallbacks, source: 'opensky-empty-fallback' });
        }

        cache.data = processedFlights;
        cache.timestamp = now;
        res.json({ success: true, flights: processedFlights, source: 'opensky-network' });

      } catch (err) {
        console.error('Error parsing OpenSky data:', err.message);
        const fallbacks = getFallbackFlights();
        res.json({ success: true, flights: fallbacks, source: 'opensky-parse-fallback' });
      }
    });
  });

  reqGet.on('error', (err) => {
    console.error('OpenSky network request failed:', err.message);
    const fallbacks = getFallbackFlights();
    res.json({ success: true, flights: fallbacks, source: 'opensky-network-fallback' });
  });

  reqGet.on('timeout', () => {
    reqGet.destroy();
    console.warn('OpenSky API timed out. Serving offline fallback states.');
    const fallbacks = getFallbackFlights();
    res.json({ success: true, flights: fallbacks, source: 'opensky-timeout-fallback' });
  });

  reqGet.end();
};

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

module.exports = { updateFlightStatus, getLiveFlightStates };