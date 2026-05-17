const axios = require('axios');
const Flight = require('../models/Flight');

const AVIATIONSTACK_BASE_URL = 'http://api.aviationstack.com/v1/flights';

const formatTime = (value) => {
    if (!value) return '';

    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
        return date.toISOString().slice(11, 16);
    }

    if (typeof value === 'string') {
        const match = value.match(/(\d{2}:\d{2})/);
        return match ? match[1] : value;
    }

    return '';
};

const buildMockPricing = (flightNumber) => {
    const seed = (flightNumber || '')
        .split('')
        .reduce((total, char) => total + char.charCodeAt(0), 0);

    const economy = 3000 + (seed % 7000);

    return {
        economy,
        business: economy + 4500,
        first: economy + 9000
    };
};

const mapApiFlightToExistingFormat = (flight) => {
    const flightNumber = flight?.flight?.iata || flight?.flight?.number || '';
    const departureDateTime = flight?.departure?.scheduled || flight?.departure?.estimated || flight?.departure?.actual || new Date().toISOString();

    return {
        flightNumber,
        airline: flight?.airline?.name || 'Unknown Airline',
        flightName: flight?.flight?.iata || flight?.flight?.icao || flightNumber || 'Unknown Flight',
        departureCity: flight?.departure?.airport || flight?.departure?.iata || 'Unknown',
        departureAirport: flight?.departure?.iata || 'Unknown',
        destinationCity: flight?.arrival?.airport || flight?.arrival?.iata || 'Unknown',
        destinationAirport: flight?.arrival?.iata || 'Unknown',
        departureDate: new Date(departureDateTime),
        departureTime: formatTime(departureDateTime),
        prices: buildMockPricing(flightNumber),
        availableSeats: {
            economy: 60,
            business: 20,
            first: 10
        }
    };
};

const filterApiFlights = (flights, filters) => {
    return flights.filter((flight) => {
        if (filters.airline && !new RegExp(filters.airline, 'i').test(flight.airline || '')) {
            return false;
        }

        if (filters.flightNumber && !new RegExp(filters.flightNumber, 'i').test(flight.flightNumber || '')) {
            return false;
        }

        if (filters.departure && !new RegExp(filters.departure, 'i').test(flight.departureAirport || '') && !new RegExp(filters.departure, 'i').test(flight.departureCity || '')) {
            return false;
        }

        if (filters.destination && !new RegExp(filters.destination, 'i').test(flight.destinationAirport || '') && !new RegExp(filters.destination, 'i').test(flight.destinationCity || '')) {
            return false;
        }

        if (filters.date && flight.departureDate) {
            const searchDate = new Date(filters.date);
            const nextDay = new Date(searchDate);
            nextDay.setDate(searchDate.getDate() + 1);

            if (flight.departureDate < searchDate || flight.departureDate >= nextDay) {
                return false;
            }
        }

        if (filters.time && !new RegExp(filters.time, 'i').test(flight.departureTime || '')) {
            return false;
        }

        if (filters.passengers && filters.cabinClass) {
            const numPassengers = parseInt(filters.passengers, 10);
            const available = flight.availableSeats?.[filters.cabinClass.toLowerCase()] || 0;

            if (available < numPassengers) {
                return false;
            }
        }

        return true;
    });
};

exports.searchFlights = async (req, res) => {
    try {
        const { departure, destination, date, time, passengers, cabinClass, airline, flightNumber } = req.query;
        let query = {};

        // Simple field filters
        if (airline) query.airline = new RegExp(airline, 'i');
        if (flightNumber) query.flightNumber = new RegExp(flightNumber, 'i');

        // Departure (OR city/airport)
        if (departure) {
            query.$or = [
                { departureCity: new RegExp(departure, 'i') },
                { departureAirport: new RegExp(departure, 'i') }
            ];
        }

        // Destination (OR city/airport) - ✅ FIXED
        if (destination) {
            const destCondition = {
                $or: [
                    { destinationCity: new RegExp(destination, 'i') },
                    { destinationAirport: new RegExp(destination, 'i') }
                ]
            };
            if (!query.$and) query.$and = [];
            query.$and.push(destCondition);
        }

        // Date range
        if (date) {
            const searchDate = new Date(date);
            const nextDay = new Date(searchDate);
            nextDay.setDate(searchDate.getDate() + 1);
            query.departureDate = { $gte: searchDate, $lt: nextDay };
        }

        // Exact time
        if (time) {
            query.departureTime = new RegExp(time, 'i');
        }

        // Seat availability
        if (passengers && cabinClass) {
            const numPassengers = parseInt(passengers);
            const classKey = `availableSeats.${cabinClass.toLowerCase()}`;
            query[classKey] = { $gte: numPassengers };
        }

        if (process.env.AVIATION_API_KEY && departure && destination) {
            try {
                const { data } = await axios.get(AVIATIONSTACK_BASE_URL, {
                    params: {
                        access_key: process.env.AVIATION_API_KEY,
                        dep_iata: departure,
                        arr_iata: destination
                    }
                });

                const mappedFlights = Array.isArray(data?.data)
                    ? data.data.map(mapApiFlightToExistingFormat)
                    : [];

                const apiFlights = filterApiFlights(mappedFlights, {
                    departure,
                    destination,
                    date,
                    time,
                    passengers,
                    cabinClass,
                    airline,
                    flightNumber
                });

                for (let flight of apiFlights) {
                    const searchDateStart = new Date(flight.departureDate);
                    searchDateStart.setHours(0, 0, 0, 0);
                    const searchDateEnd = new Date(flight.departureDate);
                    searchDateEnd.setHours(23, 59, 59, 999);

                    await Flight.findOneAndUpdate(
                        {
                            flightNumber: flight.flightNumber,
                            departureDate: { $gte: searchDateStart, $lte: searchDateEnd }
                        },
                        { $setOnInsert: flight },
                        { upsert: true, new: true }
                    );
                }
            } catch (apiError) {
                console.error("Aviation API Error:", apiError.message);
            }
        }

        const dbFlights = await Flight.find(query);

        res.status(200).json({ success: true, count: dbFlights.length, flights: dbFlights });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.trackFlight = async (req, res) => {
    try {
        const flightNumber = req.params.flightNumber || req.query.flightNumber || req.body.flightNumber;

        if (!flightNumber) {
            return res.status(400).json({ success: false, message: 'flightNumber is required' });
        }

        if (!process.env.AVIATION_API_KEY) {
            return res.status(500).json({ success: false, message: 'Aviation API key is not configured' });
        }

        const { data } = await axios.get(AVIATIONSTACK_BASE_URL, {
            params: {
                access_key: process.env.AVIATION_API_KEY,
                flight_iata: flightNumber
            }
        });

        const flight = Array.isArray(data?.data) ? data.data[0] : null;

        if (!flight) {
            return res.status(404).json({ success: false, message: 'Flight not found' });
        }

        return res.status(200).json({
            success: true,
            status: flight?.flight_status || 'unknown',
            airline: flight?.airline?.name || 'Unknown Airline',
            departure: {
                airport: flight?.departure?.airport || 'Unknown',
                iata: flight?.departure?.iata || '',
                scheduled: flight?.departure?.scheduled || null,
                terminal: flight?.departure?.terminal || null,
                gate: flight?.departure?.gate || null
            },
            arrival: {
                airport: flight?.arrival?.airport || 'Unknown',
                iata: flight?.arrival?.iata || '',
                scheduled: flight?.arrival?.scheduled || null,
                terminal: flight?.arrival?.terminal || null,
                gate: flight?.arrival?.gate || null
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ FIXED addFlight - Preserves ALL fields
exports.addFlight = async (req, res) => {
    try {
        let flightData = req.body;

        if (Array.isArray(flightData)) {
            // Handle array (10 flights)
            const created = [];
            for (let data of flightData) {
                const existing = await Flight.findOne({ flightNumber: data.flightNumber });
                if (!existing) {
                    const flight = new Flight(data);  // ✅ Preserves airline/flightName
                    await flight.save();
                    created.push(flight.flightNumber);
                }
            }
            res.status(201).json({
                success: true,
                created: created.length,
                flights: created
            });
        } else {
            // Single flight
            const flight = new Flight(flightData);  // ✅ Preserves ALL fields
            await flight.save();
            res.status(201).json({ success: true, flight });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
