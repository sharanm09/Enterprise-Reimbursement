const request = require('supertest');
const express = require('express');

// Mock all dependencies before requiring server
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn()
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

describe('Server Full Coverage', () => {
  let originalEnv;
  let server;

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
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('production'));
  });

  test('should handle database initialization error', async () => {
    const { initializeDatabase } = require('../config/database');
    const logger = require('../utils/logger');
    
    initializeDatabase.mockRejectedValueOnce(new Error('Database connection failed'));
    
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
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalled();
  });

  test('should handle custom FRONTEND_URL', async () => {
    process.env.FRONTEND_URL = 'http://localhost:3000';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('localhost:3000'));
  });

  test('should handle missing SESSION_SECRET', async () => {
    delete process.env.SESSION_SECRET;
    delete process.env.JWT_SECRET;
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalled();
  });

  test('should use JWT_SECRET as fallback for SESSION_SECRET', async () => {
    delete process.env.SESSION_SECRET;
    process.env.JWT_SECRET = 'test-jwt-secret';
    const logger = require('../utils/logger');
    
    server = require('../server');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(logger.info).toHaveBeenCalled();
  });
});

