import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import tableRoutes from './routes/tableRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restoweb';

// Middleware
app.use(cors({
  origin: '*', // Allow frontend client requests
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/tables', tableRoutes);

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
    app.listen(PORT, () => {
      console.log(`🚀 RestoWeb Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    // Still run the app so other endpoints or health checks can diagnose
    app.listen(PORT, () => {
      console.log(`⚠️ RestoWeb Server running on http://localhost:${PORT} (without DB connection)`);
    });
  });
