const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const createPaymentIntent = async (payload, token) => {
  const res = await fetch(`${API}/api/bookings/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create payment');
  return data;
};

export const confirmBooking = async (payload, token) => {
  const res = await fetch(`${API}/api/bookings/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to confirm booking');
  return data;
};

export const searchDuffelFlights = async (payload) => {
  const res = await fetch(`${API}/api/duffel/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Duffel search failed');
  return data;
};
