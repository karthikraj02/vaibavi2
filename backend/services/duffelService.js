const axios = require('axios');

const DUFFEL_API = 'https://api.duffel.com';
const DUFFEL_VERSION = 'v2';

const getHeaders = () => {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) {
    throw new Error('DUFFEL_ACCESS_TOKEN is not configured');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Duffel-Version': DUFFEL_VERSION,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, retries = 3) => {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      if (status && status < 500 && status !== 429) throw err;
      if (attempt < retries - 1) {
        await sleep(Math.pow(2, attempt) * 500);
      }
    }
  }
  throw lastError;
};

const mapOffer = (offer) => {
  const slice = offer.slices?.[0];
  const segment = slice?.segments?.[0];
  return {
    id: offer.id,
    totalAmount: offer.total_amount,
    totalCurrency: offer.total_currency,
    expiresAt: offer.expires_at,
    airline: segment?.marketing_carrier?.name || segment?.operating_carrier?.name || 'Airline',
    flightNumber: segment?.marketing_carrier_flight_number || segment?.operating_carrier_flight_number || '',
    from: slice?.origin?.iata_code || '',
    to: slice?.destination?.iata_code || '',
    departureAt: segment?.departing_at,
    arrivalAt: segment?.arriving_at,
    duration: slice?.duration,
    cabinClass: offer.cabin_class || 'economy',
    passengers: offer.passengers,
    raw: offer,
  };
};

exports.isConfigured = () => Boolean(process.env.DUFFEL_ACCESS_TOKEN);

exports.searchOffers = async ({ origin, destination, departureDate, passengers = 1, cabinClass = 'economy' }) => {
  if (!origin || !destination || !departureDate) {
    throw new Error('origin, destination, and departureDate are required');
  }

  const passengerList = Array.from({ length: Math.max(1, Number(passengers) || 1) }, () => ({ type: 'adult' }));

  return withRetry(async () => {
    const { data } = await axios.post(
      `${DUFFEL_API}/air/offer_requests`,
      {
        data: {
          slices: [{ origin, destination, departure_date: departureDate }],
          passengers: passengerList,
          cabin_class: cabinClass,
        },
      },
      { headers: getHeaders(), timeout: 30000 }
    );

    const offers = data?.data?.offers || [];
    return {
      offerRequestId: data?.data?.id,
      offers: offers.map(mapOffer),
    };
  });
};

exports.getOffer = async (offerId) => {
  return withRetry(async () => {
    const { data } = await axios.get(`${DUFFEL_API}/air/offers/${offerId}`, {
      headers: getHeaders(),
      timeout: 20000,
    });
    return mapOffer(data.data);
  });
};

exports.createOrder = async ({ offerId, passengers, payment }) => {
  if (!offerId || !passengers?.length) {
    throw new Error('offerId and passengers are required');
  }

  return withRetry(async () => {
    const payload = {
      data: {
        selected_offers: [offerId],
        passengers,
        type: 'instant',
      },
    };

    if (payment?.amount && payment?.currency) {
      payload.data.payments = [
        {
          type: 'balance',
          amount: payment.amount,
          currency: payment.currency,
        },
      ];
    }

    const { data } = await axios.post(`${DUFFEL_API}/air/orders`, payload, {
      headers: getHeaders(),
      timeout: 45000,
    });

    return data.data;
  });
};

exports.getOrder = async (orderId) => {
  return withRetry(async () => {
    const { data } = await axios.get(`${DUFFEL_API}/air/orders/${orderId}`, {
      headers: getHeaders(),
      timeout: 20000,
    });
    return data.data;
  });
};
