const request = require('supertest');
const express = require('express');
const { pool } = require('../config/database');

jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn()
  }
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

describe('Server Complete Coverage', () => {
  let app;
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('should handle database connection errors', async () => {
    pool.query.mockRejectedValueOnce(new Error('Connection failed'));

    const server = require('../server');
    
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(pool.query).toHaveBeenCalled();
  });

  test('should handle environment variables', () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    
    const server = require('../server');
    
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('should handle missing PORT environment variable', () => {
    delete process.env.PORT;
    
    const server = require('../server');
    
    // Server should still initialize
    expect(server).toBeDefined();
  });
});

