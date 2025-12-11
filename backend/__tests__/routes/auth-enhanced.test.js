const request = require('supertest');
const express = require('express');
const authRouter = require('../../routes/auth');
const User = require('../../models/User');
const Role = require('../../models/Role');
const { pool } = require('../../config/database');
const azureConfig = require('../../config/azureConfig');
const logger = require('../../utils/logger');

jest.mock('../../models/User');
jest.mock('../../models/Role');
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));
jest.mock('../../config/azureConfig');
jest.mock('../../utils/logger');
jest.mock('../../routes/auth-helpers', () => ({
  extractAzureId: jest.fn(),
  findOrCreateUser: jest.fn(),
  buildUserResponse: jest.fn()
}));

describe('Auth Routes - Enhanced Coverage', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, email: 'test@example.com', displayName: 'Test User', role: { name: 'employee' } };
      req.login = jest.fn((user, callback) => callback(null));
      req.logout = jest.fn((callback) => callback(null));
      req.session = { destroy: jest.fn((callback) => callback(null)) };
      next();
    });
    app.use('/api/auth', authRouter);
    jest.clearAllMocks();
  });

  describe('GET /user', () => {
    test('should return user when authenticated with id', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        displayName: 'Test User',
        role: { name: 'employee' },
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          displayName: 'Test User',
          email: 'test@example.com',
          role: { name: 'employee' }
        })
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    test('should return user when authenticated with _id', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        displayName: 'Test User',
        role: { name: 'employee' },
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          displayName: 'Test User',
          email: 'test@example.com',
          role: { name: 'employee' }
        })
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { _id: 1 };
        next();
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return user when authenticated with session passport user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        displayName: 'Test User',
        role: { name: 'employee' },
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          displayName: 'Test User',
          email: 'test@example.com',
          role: { name: 'employee' }
        })
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = {};
        req.session = { passport: { user: 1 } };
        next();
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 401 when userId not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = {};
        req.session = {};
        next();
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Not authenticated');
    });

    test('should return 401 when user not found in database', async () => {
      User.findById.mockResolvedValue(null);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 999 };
        next();
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('User not found');
    });

    test('should handle user without toJSON method', async () => {
      const mockUser = {
        id: 1,
        _id: 1,
        email: 'test@example.com',
        displayName: 'Test User',
        role: { name: 'employee' }
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle database errors', async () => {
      User.findById.mockRejectedValue(new Error('Database error'));

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /roles', () => {
    test('should return all roles', async () => {
      const mockRoles = [
        { id: 1, name: 'employee', toJSON: () => ({ id: 1, name: 'employee' }) },
        { id: 2, name: 'manager', toJSON: () => ({ id: 2, name: 'manager' }) }
      ];

      Role.findAll = jest.fn().mockResolvedValue(mockRoles);

      const response = await request(app)
        .get('/api/auth/roles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.roles).toHaveLength(2);
    });

    test('should handle database errors', async () => {
      Role.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/roles')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /test-users', () => {
    test('should return test users in non-production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      pool.query.mockResolvedValue({
        rows: [
          { id: 1, display_name: 'Test User', email: 'test@test.com', role_name: 'employee', role_display_name: 'Employee' }
        ]
      });

      const response = await request(app)
        .get('/api/auth/test-users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    test('should return 403 in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/auth/test-users')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('production');

      process.env.NODE_ENV = originalEnv;
    });

    test('should handle database errors', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/test-users')
        .expect(500);

      expect(response.body.success).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('POST /test-login', () => {
    test('should login test user successfully', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const mockUser = {
        id: 1,
        email: 'test@test.com',
        displayName: 'Test User',
        role: { name: 'employee' },
        azureId: 'test-123',
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          displayName: 'Test User',
          email: 'test@test.com',
          role: { name: 'employee' }
        })
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.login = jest.fn((user, callback) => callback(null));
        next();
      });

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });

    test('should return 403 in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(403);

      expect(response.body.success).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    test('should return 400 when userId is missing', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    test('should return 404 when user not found', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 999 })
        .expect(404);

      expect(response.body.success).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    test('should return 403 when user is not a test user', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const mockUser = {
        id: 1,
        email: 'real@example.com',
        azureId: 'real-123'
      };

      User.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(403);

      expect(response.body.success).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    test('should handle session creation errors', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';

      const mockUser = {
        id: 1,
        email: 'test@test.com',
        azureId: 'test-123',
        toJSON: jest.fn().mockReturnValue({ id: 1 })
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.login = jest.fn((user, callback) => callback(new Error('Session error')));
        next();
      });

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(500);

      expect(response.body.success).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('GET /logout', () => {
    test('should logout successfully', async () => {
      app.use((req, res, next) => {
        req.logout = jest.fn((callback) => callback(null));
        req.session = { destroy: jest.fn((callback) => callback(null)) };
        next();
      });

      const response = await request(app)
        .get('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle logout errors', async () => {
      app.use((req, res, next) => {
        req.logout = jest.fn((callback) => callback(new Error('Logout error')));
        req.session = { destroy: jest.fn((callback) => callback(null)) };
        next();
      });

      const response = await request(app)
        .get('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle session destroy errors', async () => {
      app.use((req, res, next) => {
        req.logout = jest.fn((callback) => callback(null));
        req.session = { destroy: jest.fn((callback) => callback(new Error('Destroy error'))) };
        next();
      });

      const response = await request(app)
        .get('/api/auth/logout')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /logout', () => {
    test('should logout successfully via POST', async () => {
      app.use((req, res, next) => {
        req.logout = jest.fn((callback) => callback(null));
        req.session = { destroy: jest.fn((callback) => callback(null)) };
        next();
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

