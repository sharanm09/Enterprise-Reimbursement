// Load environment variables FIRST, before any other imports
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { pool, initializeDatabase } = require('./config/database');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const dashboardStatsRoutes = require('./routes/dashboardStats');
const reimbursementRoutes = require('./routes/reimbursements');
const masterDataRoutes = require('./routes/masterData');
const approvalRoutes = require('./routes/approvals');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security: Disable Express version disclosure
app.set('x-powered-by', false);

// Middleware
app.use(cors({
  origin: true, // Allow all origins (reflects request origin)
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production', // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Initialize PostgreSQL database
// NOSONAR: Top-level await not available in CommonJS modules
console.log('\n========================================');
console.log('Starting Enterprise Reimbursement Backend');
console.log('========================================\n');

(async () => {
  try {
    console.log('[STARTUP] Connecting to PostgreSQL database...');
    console.log(`[STARTUP] Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
    console.log(`[STARTUP] Database: ${process.env.DB_NAME || 'enterprise_auth_db'}\n`);

    await initializeDatabase();

    console.log('[STARTUP] ✅ PostgreSQL database initialized successfully\n');
    logger.info('PostgreSQL database initialized successfully');
  } catch (error) {
    console.error('[STARTUP] ❌ Error initializing PostgreSQL database:', error.message);
    logger.error('Error initializing PostgreSQL database:', error.message);
    logger.warn('The app will continue, but database operations may fail.');
    logger.warn('Please ensure PostgreSQL is running and credentials are correct in .env file.');
  }
})();

// Routes - Use API prefix from env or default to /api
const API_PREFIX = process.env.API_PREFIX || '/api';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardStatsRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/master-data`, masterDataRoutes);
app.use(`${API_PREFIX}/reimbursements`, reimbursementRoutes);
app.use(`${API_PREFIX}/approvals`, approvalRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
});

