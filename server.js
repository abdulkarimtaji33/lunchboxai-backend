'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const { PORT }           = require('./src/config/env');
const { testConnection } = require('./src/config/database');
const passport           = require('./src/config/passport');

const authRoutes         = require('./src/routes/authRoutes');
const allergenRoutes     = require('./src/routes/allergenRoutes');
const foodItemRoutes     = require('./src/routes/foodItemRoutes');
const nutritionGoalRoutes= require('./src/routes/nutritionGoalRoutes');
const childRoutes        = require('./src/routes/childRoutes');
const lunchboxRoutes     = require('./src/routes/lunchboxRoutes');
const errorHandler       = require('./src/middleware/errorHandler');

const app = express();

// --- Core middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Serve uploaded files ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Passport (no sessions — JWT only) ---
app.use(passport.initialize());

// --- Health check ---
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- API routes ---
app.use('/api/auth',             authRoutes);
app.use('/api/allergens',        allergenRoutes);
app.use('/api/food-items',       foodItemRoutes);
app.use('/api/nutrition-goals',  nutritionGoalRoutes);
app.use('/api/children',         childRoutes);
app.use('/api/lunchbox',         lunchboxRoutes);

// --- 404 for unknown routes ---
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// --- Global error handler ---
app.use(errorHandler);

// --- Start ---
async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`LunchBox AI server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
