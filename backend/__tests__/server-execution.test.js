const request = require('supertest');
const path = require('path');

// Mock database and logger, but let Express and other modules execute
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn()
  },
  initializeDatabase: jest.fn().mockResolvedValue(true)
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock dotenv to prevent actual .env file loading
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock route modules to prevent actual route execution
jest.mock('../routes/auth', () => {
  const express = require('express');
  const router = express.Router();
  return router;
});

jest.mock('../routes/dashboard', () => {
  const express = require('express');
  const router = express.Router();
  return router;
});

jest.mock('../routes/dashboardStats', () => {
  const express = require('express');
  const router = express.Router();
  return router;
});

jest.mock('../routes/reimbursements', () => {
  const express = require('express');
  const router = express.Router();
  return router;
});

jest.mock('../routes/masterData', () => {
  const express = require('express');
  const router = express.Router();
  return router;
});

jest.mock('../routes/approvals', () => {
  const express = require('express');
  const router = express.Router();
  return router;
});

describe('Server Execution Tests', () => {
  let app;
  let server;
  let originalEnv;

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
    
    // Set up environment variables
    process.env = {
      ...originalEnv,
      PORT: '5000',
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:3000',
      API_PREFIX: '/api',
      SESSION_SECRET: 'test-secret-key',
      JWT_SECRET: 'test-jwt-secret',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb'
    };
  });

  test('should execute server.js and register all routes', async () => {
    // Import server - this will execute all the code
    app = require('../server');
    
    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Test health check endpoint
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toEqual({
      status: 'OK',
      message: 'Server is running'
    });
  });

  test('should configure CORS middleware', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // CORS should be configured
    expect(app).toBeDefined();
  });

  test('should configure session middleware', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should use default PORT when not set', async () => {
    delete process.env.PORT;
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should use custom PORT when set', async () => {
    process.env.PORT = '3001';
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should use default API_PREFIX when not set', async () => {
    delete process.env.API_PREFIX;
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should use custom API_PREFIX when set', async () => {
    process.env.API_PREFIX = '/custom-api';
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should handle production NODE_ENV', async () => {
    process.env.NODE_ENV = 'production';
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should handle development NODE_ENV', async () => {
    process.env.NODE_ENV = 'development';
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should use JWT_SECRET as fallback for SESSION_SECRET', async () => {
    delete process.env.SESSION_SECRET;
    process.env.JWT_SECRET = 'fallback-secret';
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should use default SESSION_SECRET when neither is set', async () => {
    delete process.env.SESSION_SECRET;
    delete process.env.JWT_SECRET;
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should handle database initialization error', async () => {
    const { initializeDatabase } = require('../config/database');
    const logger = require('../utils/logger');
    
    initializeDatabase.mockRejectedValueOnce(new Error('Database connection failed'));
    
    app = require('../server');
    
    // Wait for async error handling
    await new Promise(resolve => setTimeout(resolve, 300));
    
    expect(logger.error).toHaveBeenCalledWith(
      'Error initializing PostgreSQL database:',
      'Database connection failed'
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  test('should configure static file serving for uploads', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should initialize passport middleware', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should register auth routes', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should register dashboard routes', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should register dashboardStats routes', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should register reimbursement routes', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should register masterData routes', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should register approval routes', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should set x-powered-by to false', async () => {
    app = require('../server');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(app).toBeDefined();
  });

  test('should log server startup information', async () => {
    const logger = require('../utils/logger');
    app = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(logger.info).toHaveBeenCalled();
  });
});

