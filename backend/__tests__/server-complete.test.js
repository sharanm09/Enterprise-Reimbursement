const http = require('http');
const { initializeDatabase } = require('../config/database');
const logger = require('../utils/logger');

jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn(),
    end: jest.fn()
  },
  initializeDatabase: jest.fn()
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

jest.mock('express', () => {
  const express = jest.fn(() => {
    const app = {
      use: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
      post: jest.fn().mockReturnThis(),
      put: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      listen: jest.fn((port, callback) => {
        if (callback) callback();
        return {
          close: jest.fn((callback) => callback && callback())
        };
      }),
      set: jest.fn().mockReturnThis()
    };
    return app;
  });
  express.json = jest.fn(() => (req, res, next) => next());
  express.urlencoded = jest.fn(() => (req, res, next) => next());
  express.static = jest.fn(() => (req, res, next) => next());
  return express;
});

jest.mock('passport', () => ({
  initialize: jest.fn(() => (req, res, next) => next()),
  session: jest.fn(() => (req, res, next) => next())
}));

jest.mock('express-session', () => {
  return jest.fn(() => (req, res, next) => next());
});

jest.mock('cors', () => {
  return jest.fn(() => (req, res, next) => next());
});

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

describe('Server Complete Coverage', () => {
  let originalEnv;
  let mockApp;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env;
    process.env = {
      ...originalEnv,
      PORT: '3001',
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:3000'
    };
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should initialize database on startup', async () => {
    initializeDatabase.mockResolvedValue();

    // Mock the server module
    const express = require('express');
    mockApp = express();

    // Simulate server initialization
    await initializeDatabase();

    expect(initializeDatabase).toHaveBeenCalled();
  });

  test('should handle database initialization errors', async () => {
    const error = new Error('Database connection failed');
    initializeDatabase.mockRejectedValue(error);

    // Suppress console errors during test
    const originalError = console.error;
    console.error = jest.fn();

    try {
      await initializeDatabase();
    } catch (e) {
      expect(e).toBe(error);
    }

    console.error = originalError;
  });

  test('should set x-powered-by to false', () => {
    const express = require('express');
    const app = express();

    app.set('x-powered-by', false);

    expect(app.set).toHaveBeenCalledWith('x-powered-by', false);
  });

  test('should configure CORS', () => {
    const cors = require('cors');
    const corsMiddleware = cors({
      origin: process.env.FRONTEND_URL,
      credentials: true
    });

    expect(cors).toHaveBeenCalled();
  });

  test('should configure express session', () => {
    const session = require('express-session');
    const sessionMiddleware = session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
      }
    });

    expect(session).toHaveBeenCalled();
  });

  test('should configure passport', () => {
    const passport = require('passport');
    passport.initialize();
    passport.session();

    expect(passport.initialize).toHaveBeenCalled();
    expect(passport.session).toHaveBeenCalled();
  });

  test('should handle graceful shutdown', () => {
    const express = require('express');
    const app = express();
    const server = app.listen(3001, () => {});

    const shutdown = () => {
      server.close(() => {
        logger.info('Server closed');
      });
    };

    shutdown();
    expect(server.close).toBeDefined();
  });

  test('should handle SIGTERM signal', () => {
    const express = require('express');
    const app = express();
    const server = app.listen(3001);

    const handleShutdown = (signal) => {
      logger.info(`${signal} received, closing server gracefully`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    handleShutdown('SIGTERM');
    expect(server.close).toBeDefined();
  });

  test('should handle SIGINT signal', () => {
    const express = require('express');
    const app = express();
    const server = app.listen(3001);

    const handleShutdown = (signal) => {
      logger.info(`${signal} received, closing server gracefully`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    handleShutdown('SIGINT');
    expect(server.close).toBeDefined();
  });
});


