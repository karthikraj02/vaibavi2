import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const CheckoutForm = ({ onSuccess, onError, submitting, setSubmitting }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message);
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent);
      } else {
        onError('Payment was not completed. Please try again.');
      }
    } catch (err) {
      onError(err.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-neonCyan to-blue-600 font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="animate-spin" size={18} /> Processing payment...
          </>
        ) : (
          'Pay & Confirm Booking'
        )}
      </button>
    </form>
  );
};

const StripeCheckout = ({ clientSecret, onSuccess, onError }) => {
  const [submitting, setSubmitting] = useState(false);

  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    return (
      <p className="text-amber-400 text-sm text-center">
        Stripe publishable key not configured. Set VITE_STRIPE_PUBLISHABLE_KEY in frontend .env
      </p>
    );
  }

  if (!clientSecret) return null;

  const options = {
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#00F0FF',
        colorBackground: '#0B0F19',
        colorText: '#ffffff',
        borderRadius: '12px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm
        onSuccess={onSuccess}
        onError={onError}
        submitting={submitting}
        setSubmitting={setSubmitting}
      />
    </Elements>
  );
};

export default StripeCheckout;
