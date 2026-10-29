import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { initSocket } from './socket.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restoweb';

// Middleware
app.use(cors({
  origin: '*', // Allow frontend client requests
  credentials: true,
}));
app.use(express.json());

// Initialize Socket.io with HTTP server
initSocket(server);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);

// Root & Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'RestoWeb Server is running smoothly',
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Database Connection & Server Start
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully at:', MONGODB_URI);
    server.listen(PORT, () => {
      console.log(`🚀 RestoWeb Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    // Still run the app so other endpoints or health checks can diagnose
    server.listen(PORT, () => {
      console.log(`⚠️ RestoWeb Server running on http://localhost:${PORT} (without DB connection)`);
    });
  });
