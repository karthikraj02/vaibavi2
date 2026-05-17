const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { stripeWebhook } = require('./controllers/webhookController');
const { isProduction } = require('./utils/config');

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const refundRoutes = require('./routes/refundRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const duffelRoutes = require('./routes/duffelRoutes');
const flightRoutes = require('./routes/flightRoutes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || !isProduction) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Stripe webhook must use raw body — register before express.json()
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '2mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

app.set('io', io);

const connectDatabase = async () => {
  if (process.env.MONGO_URI) {
    console.log('Connecting to MongoDB via MONGO_URI...');
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('MongoDB connected successfully');
    } catch (err) {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    }
    return;
  }

  if (isProduction) {
    console.error('MONGO_URI is required in production');
    process.exit(1);
  }

  const localUri = 'mongodb://127.0.0.1:27017/flightagent';
  console.log('Attempting connection to local MongoDB on 127.0.0.1:27017...');
  try {
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
    console.log('MongoDB connected locally');
  } catch (err) {
    console.log('Local MongoDB not running. Starting in-memory MongoDB fallback (dev only)...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      console.log('MongoDB connected to in-memory instance');
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB:', memErr);
      process.exit(1);
    }
  }
};

connectDatabase();

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/duffel', duffelRoutes);
app.use('/api/flights', flightRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'FlightAgent Enterprise API is running.',
    duffel: Boolean(process.env.DUFFEL_ACCESS_TOKEN),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'FlightAgent Enterprise API is online.',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      bookings: '/api/bookings',
      duffel: '/api/duffel',
      tickets: '/api/tickets',
      webhooks: '/api/webhooks/stripe',
    },
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
