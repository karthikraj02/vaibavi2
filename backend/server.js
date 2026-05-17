const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const aiRoutes = require('./routes/aiRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const refundRoutes = require('./routes/refundRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const ticketRoutes = require('./routes/ticketRoutes');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Make Socket.io accessible in routes/controllers
app.set('io', io);

// Database Connection
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

  // Try local MongoDB on 127.0.0.1
  const localUri = 'mongodb://127.0.0.1:27017/flightagent';
  console.log('Attempting connection to local MongoDB on 127.0.0.1:27017...');
  try {
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 2000 });
    console.log('MongoDB connected locally');
  } catch (err) {
    console.log('Local MongoDB not running. Starting automated in-memory MongoDB fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      console.log('In-memory MongoDB server started at:', mongoUri);
      await mongoose.connect(mongoUri);
      console.log('MongoDB connected successfully to in-memory instance');
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB:', memErr);
      process.exit(1);
    }
  }
};

connectDatabase();

// Real-time Sockets
io.on('connection', (socket) => {
  console.log('New client connected via Socket.io:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/tickets', ticketRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'FlightAgent Enterprise API is running successfully.' });
});

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'FlightAgent Enterprise API is online and running successfully.',
    version: '1.0.0',
    documentation: 'See the React frontend application to interact with FlightAgent.',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      ai: '/api/ai',
      bookings: '/api/bookings',
      refunds: '/api/refunds',
      tracking: '/api/tracking',
      tickets: '/api/tickets'
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});