const duffelService = require('../services/duffelService');

const ensureDuffel = (res) => {
  if (!duffelService.isConfigured()) {
    res.status(503).json({
      success: false,
      message: 'Duffel API is not configured. Set DUFFEL_ACCESS_TOKEN in backend environment.',
    });
    return false;
  }
  return true;
};

exports.searchFlights = async (req, res) => {
  try {
    if (!ensureDuffel(res)) return;
    const { origin, destination, departureDate, passengers, cabinClass } = req.body;
    const result = await duffelService.searchOffers({
      origin: origin?.toUpperCase(),
      destination: destination?.toUpperCase(),
      departureDate,
      passengers,
      cabinClass,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message || error.message;
    res.status(error.response?.status || 500).json({ success: false, message });
  }
};

exports.getOffer = async (req, res) => {
  try {
    if (!ensureDuffel(res)) return;
    const offer = await duffelService.getOffer(req.params.offerId);
    res.json({ success: true, offer });
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message || error.message;
    res.status(error.response?.status || 500).json({ success: false, message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    if (!ensureDuffel(res)) return;
    const { offerId, passengers, payment } = req.body;
    const order = await duffelService.createOrder({ offerId, passengers, payment });
    res.status(201).json({ success: true, order });
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message || error.message;
    res.status(error.response?.status || 500).json({ success: false, message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    if (!ensureDuffel(res)) return;
    const order = await duffelService.getOrder(req.params.orderId);
    res.json({ success: true, order });
  } catch (error) {
    const message = error.response?.data?.errors?.[0]?.message || error.message;
    res.status(error.response?.status || 500).json({ success: false, message });
  }
};
