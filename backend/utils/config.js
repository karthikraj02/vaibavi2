const isProduction = process.env.NODE_ENV === 'production';

const requireEnv = (key) => {
  const value = process.env[key];
  if (!value && isProduction) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

exports.isProduction = isProduction;

exports.getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret && isProduction) {
    throw new Error('JWT_SECRET must be set in production');
  }
  return secret || 'dev-only-jwt-secret-change-me';
};

exports.getStripe = () => {
  const Stripe = require('stripe');
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key && isProduction) {
    throw new Error('STRIPE_SECRET_KEY must be set in production');
  }
  if (!key) return null;
  return Stripe(key);
};
