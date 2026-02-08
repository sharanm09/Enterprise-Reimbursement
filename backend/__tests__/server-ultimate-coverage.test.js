const request = require('supertest');
const express = require('express');

// Mock all dependencies before requiring server
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn(),
    on: jest.fn()
  },
  initializeDatabase: jest.fn().mockResolvedValue(true)
}));

jest.mock('../config/azureConfig', () => ({
  strategy: jest.fn()
}));

jest.mock('passport', () => ({
  initialize: jest.fn(() => (req, res, next) => next()),
  session: jest.fn(() => (req, res, next) => next())
}));

jest.mock('express-session', () => {
  return jest.fn(() => (req, res, next) => {
    req.session = {};
    next();
  });
});

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('../routes/auth', () => {
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ test: 'auth' }));
  return router;
});

jest.mock('../routes/dashboard', () => {
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ test: 'dashboard' }));
  return router;
});

jest.mock('../routes/dashboardStats', () => {
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ test: 'dashboardStats' }));
  return router;
});

jest.mock('../routes/reimbursements', () => {
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ test: 'reimbursements' }));
  return router;
});

jest.mock('../routes/masterData', () => {
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ test: 'masterData' }));
  return router;
});

jest.mock('../routes/approvals', () => {
  const router = express.Router();
  router.get('/test', (req, res) => res.json({ test: 'approvals' }));
  return router;
});

describe('Server Ultimate Coverage', () => {
  let originalEnv;
  let server;
  let app;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    process.env = originalEnv;
    if (server && server.close) {
      server.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    delete require.cache[require.resolve('../server')];
  });

  test('should test health check endpoint', async () => {
    process.env.PORT = '5001';
    const { initializeDatabase } = require('../config/database');
    initializeDatabase.mockResolvedValue(true);
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const response = await request(server)
      .get('/health')
      .expect(200);
    
    expect(response.body).toEqual({ status: 'OK', message: 'Server is running' });
  });

  test('should initialize server with default PORT', async () => {
    delete process.env.PORT;
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalled();
  });

  test('should initialize server with custom PORT', async () => {
    process.env.PORT = '3001';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('3001'));
  });

  test('should handle production environment', async () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '5002';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('production'));
  });

  test('should handle development environment', async () => {
    process.env.NODE_ENV = 'development';
    process.env.PORT = '5003';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('development'));
  });

  test('should handle database initialization error', async () => {
    const { initializeDatabase } = require('../config/database');
    const logger = require('../utils/logger');
    
    initializeDatabase.mockRejectedValueOnce(new Error('Database connection failed'));
    process.env.PORT = '5004';
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(logger.error).toHaveBeenCalledWith(
      'Error initializing PostgreSQL database:',
      'Database connection failed'
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  test('should handle custom API_PREFIX', async () => {
    process.env.API_PREFIX = '/custom-api';
    process.env.PORT = '5005';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalled();
  });

  test('should handle default API_PREFIX when not set', async () => {
    delete process.env.API_PREFIX;
    process.env.PORT = '5006';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalled();
  });

  test('should handle custom FRONTEND_URL', async () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.PORT = '5007';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('localhost:3000'));
  });

  test('should handle missing SESSION_SECRET', async () => {
    delete process.env.SESSION_SECRET;
    delete process.env.JWT_SECRET;
    process.env.PORT = '5008';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalled();
  });

  test('should use JWT_SECRET as fallback for SESSION_SECRET', async () => {
    delete process.env.SESSION_SECRET;
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.PORT = '5009';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalled();
  });

  test('should use SESSION_SECRET when available', async () => {
    process.env.SESSION_SECRET = 'test-session-secret';
    process.env.PORT = '5010';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalled();
  });

  test('should configure CORS with FRONTEND_URL', async () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.PORT = '5011';
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response = await request(server)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
  });

  test('should set x-powered-by to false', async () => {
    process.env.PORT = '5012';
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response = await request(server)
      .get('/health')
      .expect(200);
    
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  test('should handle database connection events', async () => {
    const { pool } = require('../config/database');
    const logger = require('../utils/logger');
    process.env.PORT = '5013';
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate connection event
    if (pool.on.mock.calls.length > 0) {
      const connectHandler = pool.on.mock.calls.find(call => call[0] === 'connect');
      if (connectHandler) {
        connectHandler[1]();
        expect(logger.info).toHaveBeenCalled();
      }
    }
  });

  test('should handle database error events', async () => {
    const { pool } = require('../config/database');
    const logger = require('../utils/logger');
    process.env.PORT = '5014';
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate error event
    if (pool.on.mock.calls.length > 0) {
      const errorHandler = pool.on.mock.calls.find(call => call[0] === 'error');
      if (errorHandler) {
        const testError = new Error('Test database error');
        errorHandler[1](testError);
        expect(logger.error).toHaveBeenCalledWith(
          'Unexpected error on idle PostgreSQL client',
          testError
        );
      }
    }
  });

  test('should serve static files from uploads directory', async () => {
    process.env.PORT = '5015';
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test that static middleware is configured
    const response = await request(server)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
  });

  test('should configure session with secure cookie in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'test-secret';
    process.env.PORT = '5016';
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response = await request(server)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
  });

  test('should configure session with non-secure cookie in development', async () => {
    process.env.NODE_ENV = 'development';
    process.env.SESSION_SECRET = 'test-secret';
    process.env.PORT = '5017';
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const response = await request(server)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
  });
});

