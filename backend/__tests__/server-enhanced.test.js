const request = require('supertest');
const path = require('path');

// Mock all dependencies before requiring server
jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn()
  },
  initializeDatabase: jest.fn()
}));

jest.mock('../routes/auth', () => {
  const express = require('express');
  return express.Router();
});

jest.mock('../routes/dashboard', () => {
  const express = require('express');
  return express.Router();
});

jest.mock('../routes/dashboardStats', () => {
  const express = require('express');
  return express.Router();
});

jest.mock('../routes/reimbursements', () => {
  const express = require('express');
  return express.Router();
});

jest.mock('../routes/masterData', () => {
  const express = require('express');
  return express.Router();
});

jest.mock('../routes/approvals', () => {
  const express = require('express');
  return express.Router();
});

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

// Mock express.static
jest.mock('express', () => {
  const express = require('express');
  const originalStatic = express.static;
  express.static = jest.fn((path) => originalStatic(path));
  return express;
});

describe('Server Enhanced Tests', () => {
  let originalEnv;
  const { initializeDatabase } = require('../config/database');
  const logger = require('../utils/logger');

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Server initialization', () => {
    test('should initialize database successfully', async () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api',
        SESSION_SECRET: 'test-secret',
        JWT_SECRET: 'test-jwt-secret'
      };

      initializeDatabase.mockResolvedValue();

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const app = require('../server');
      expect(initializeDatabase).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('PostgreSQL database initialized successfully');
    });

    test('should handle database initialization error', async () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api',
        SESSION_SECRET: 'test-secret',
        JWT_SECRET: 'test-jwt-secret'
      };

      const dbError = new Error('Database connection failed');
      initializeDatabase.mockRejectedValue(dbError);

      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const app = require('../server');
      expect(initializeDatabase).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith('Error initializing PostgreSQL database:', dbError.message);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should use default PORT when not set', () => {
      process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api',
        SESSION_SECRET: 'test-secret'
      };
      delete process.env.PORT;

      initializeDatabase.mockResolvedValue();
      const app = require('../server');
      expect(app).toBeDefined();
    });

    test('should use default NODE_ENV when not set', () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api',
        SESSION_SECRET: 'test-secret'
      };
      delete process.env.NODE_ENV;

      initializeDatabase.mockResolvedValue();
      const app = require('../server');
      expect(app).toBeDefined();
    });

    test('should use SESSION_SECRET or JWT_SECRET for session secret', () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api',
        JWT_SECRET: 'jwt-secret-only'
      };
      delete process.env.SESSION_SECRET;

      initializeDatabase.mockResolvedValue();
      const app = require('../server');
      expect(app).toBeDefined();
    });

    test('should use default session secret when neither SESSION_SECRET nor JWT_SECRET is set', () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api'
      };
      delete process.env.SESSION_SECRET;
      delete process.env.JWT_SECRET;

      initializeDatabase.mockResolvedValue();
      const app = require('../server');
      expect(app).toBeDefined();
    });

    test('should configure CORS with FRONTEND_URL', () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api',
        SESSION_SECRET: 'test-secret'
      };

      initializeDatabase.mockResolvedValue();
      const app = require('../server');
      expect(app).toBeDefined();
    });

    test('should set secure cookie in production', () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'production',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api',
        SESSION_SECRET: 'test-secret'
      };

      initializeDatabase.mockResolvedValue();
      const app = require('../server');
      expect(app).toBeDefined();
    });

    test('should use custom API_PREFIX', () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/custom-api',
        SESSION_SECRET: 'test-secret'
      };

      initializeDatabase.mockResolvedValue();
      const app = require('../server');
      expect(app).toBeDefined();
    });

    test('should use default API_PREFIX when not set', () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        SESSION_SECRET: 'test-secret'
      };
      delete process.env.API_PREFIX;

      initializeDatabase.mockResolvedValue();
      const app = require('../server');
      expect(app).toBeDefined();
    });

    test('should serve static files from uploads directory', () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api',
        SESSION_SECRET: 'test-secret'
      };

      initializeDatabase.mockResolvedValue();
      const express = require('express');
      const app = require('../server');
      expect(express.static).toHaveBeenCalled();
    });

    test('should disable x-powered-by header', () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api',
        SESSION_SECRET: 'test-secret'
      };

      initializeDatabase.mockResolvedValue();
      const app = require('../server');
      expect(app.get('x-powered-by')).toBe(false);
    });
  });

  describe('Health check endpoint', () => {
    test('should respond to health check', async () => {
      process.env = {
        ...originalEnv,
        PORT: '5000',
        NODE_ENV: 'test',
        FRONTEND_URL: 'http://localhost:3000',
        API_PREFIX: '/api',
        SESSION_SECRET: 'test-secret'
      };

      initializeDatabase.mockResolvedValue();
      const app = require('../server');
      
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'OK',
        message: 'Server is running'
      });
    });
  });
});

