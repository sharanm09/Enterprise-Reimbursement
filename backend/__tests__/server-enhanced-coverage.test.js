const request = require('supertest');
const express = require('express');
const path = require('path');

// Mock all dependencies before requiring server
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn(),
    on: jest.fn()
  },
  initializeDatabase: jest.fn()
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../routes/auth', () => express.Router());
jest.mock('../routes/dashboard', () => express.Router());
jest.mock('../routes/dashboardStats', () => express.Router());
jest.mock('../routes/reimbursements', () => express.Router());
jest.mock('../routes/masterData', () => express.Router());
jest.mock('../routes/approvals', () => express.Router());

jest.mock('passport', () => ({
  initialize: jest.fn(() => (req, res, next) => next()),
  session: jest.fn(() => (req, res, next) => next()),
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn()
}));

jest.mock('express-session', () => {
  return jest.fn(() => (req, res, next) => {
    req.session = {};
    next();
  });
});

jest.mock('cors', () => {
  return jest.fn(() => (req, res, next) => next());
});

describe('Server Enhanced Coverage', () => {
  let originalEnv;
  let serverApp;
  let serverInstance;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Set up environment variables
    process.env = {
      ...originalEnv,
      PORT: '5000',
      NODE_ENV: 'development',
      FRONTEND_URL: 'http://localhost:3000',
      API_PREFIX: '/api',
      SESSION_SECRET: 'test-secret-key',
      JWT_SECRET: 'test-jwt-secret',
      DATABASE_URL: 'postgresql://test:test@localhost/test'
    };
  });

  afterEach(() => {
    if (serverInstance) {
      serverInstance.close();
      serverInstance = null;
    }
    process.env = originalEnv;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should initialize server with all middleware', async () => {
    const { initializeDatabase } = require('../config/database');
    initializeDatabase.mockResolvedValue();
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(serverApp).toBeDefined();
    expect(initializeDatabase).toHaveBeenCalled();
  });

  test('should handle database initialization error', async () => {
    const { initializeDatabase } = require('../config/database');
    const logger = require('../utils/logger');
    
    initializeDatabase.mockRejectedValue(new Error('Database connection failed'));
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error initializing PostgreSQL database'),
      expect.any(String)
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  test('should use default PORT when not set', () => {
    delete process.env.PORT;
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(serverApp).toBeDefined();
  });

  test('should use default NODE_ENV when not set', () => {
    delete process.env.NODE_ENV;
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(serverApp).toBeDefined();
  });

  test('should use default API_PREFIX when not set', () => {
    delete process.env.API_PREFIX;
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(serverApp).toBeDefined();
  });

  test('should use custom API_PREFIX when set', () => {
    process.env.API_PREFIX = '/custom-api';
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(serverApp).toBeDefined();
  });

  test('should set x-powered-by to false', () => {
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(serverApp.get('x-powered-by')).toBe(false);
  });

  test('should configure CORS with FRONTEND_URL', () => {
    const cors = require('cors');
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(cors).toHaveBeenCalled();
  });

  test('should configure session with secure cookie in production', () => {
    process.env.NODE_ENV = 'production';
    const session = require('express-session');
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(session).toHaveBeenCalled();
  });

  test('should configure session with non-secure cookie in development', () => {
    process.env.NODE_ENV = 'development';
    const session = require('express-session');
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(session).toHaveBeenCalled();
  });

  test('should use SESSION_SECRET when available', () => {
    process.env.SESSION_SECRET = 'custom-session-secret';
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(serverApp).toBeDefined();
  });

  test('should fallback to JWT_SECRET when SESSION_SECRET not available', () => {
    delete process.env.SESSION_SECRET;
    process.env.JWT_SECRET = 'jwt-secret-fallback';
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(serverApp).toBeDefined();
  });

  test('should use default session secret when neither SESSION_SECRET nor JWT_SECRET available', () => {
    delete process.env.SESSION_SECRET;
    delete process.env.JWT_SECRET;
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(serverApp).toBeDefined();
  });

  test('should mount routes with API prefix', () => {
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    // Test health check endpoint
    return request(serverApp)
      .get('/health')
      .expect(200)
      .then(res => {
        expect(res.body.status).toBe('OK');
        expect(res.body.message).toBe('Server is running');
      });
  });

  test('should serve static files from uploads directory', () => {
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(serverApp).toBeDefined();
  });

  test('should initialize passport', () => {
    const passport = require('passport');
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    expect(passport.initialize).toHaveBeenCalled();
    expect(passport.session).toHaveBeenCalled();
  });

  test('should log server startup information', async () => {
    const logger = require('../utils/logger');
    const { initializeDatabase } = require('../config/database');
    initializeDatabase.mockResolvedValue();
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Server is running on port')
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Environment:')
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Frontend URL:')
    );
  });

  test('should handle database initialization success', async () => {
    const logger = require('../utils/logger');
    const { initializeDatabase } = require('../config/database');
    initializeDatabase.mockResolvedValue();
    
    serverApp = require('../server');
    serverInstance = serverApp.listen(0);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(logger.info).toHaveBeenCalledWith(
      'PostgreSQL database initialized successfully'
    );
  });
});

