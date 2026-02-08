const request = require('supertest');
const express = require('express');
const authRouter = require('../../routes/auth');
const User = require('../../models/User');
const Role = require('../../models/Role');
const { pool } = require('../../config/database');
const { handleTokenValidation, handleUserLogin } = require('../../routes/auth-helpers');

jest.mock('../../models/User');
jest.mock('../../models/Role');
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

jest.mock('../../routes/auth-helpers', () => ({
  handleTokenValidation: jest.fn(),
  handleUserLogin: jest.fn(),
  handleUserRoleUpdate: jest.fn()
}));

jest.mock('../../routes/auth-role-helpers', () => ({
  updateUserRoleWithManager: jest.fn()
}));

jest.mock('passport', () => ({
  authenticate: jest.fn(() => (req, res, next) => next())
}));

describe('Auth Routes Complete Coverage', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'superadmin' } };
      req.login = jest.fn((user, callback) => callback(null));
      req.logout = jest.fn((callback) => callback(null));
      req.session = { destroy: jest.fn((callback) => callback(null)) };
      next();
    });
    app.use('/api/auth', authRouter);
    jest.clearAllMocks();
  });

  describe('POST /validate-token', () => {
    test('should validate token successfully', async () => {
      const mockUser = {
        id: 1,
        toJSON: jest.fn().mockReturnValue({ id: 1, email: 'test@test.com' }),
        role: { name: 'employee' }
      };
      handleTokenValidation.mockResolvedValue(mockUser);
      handleUserLogin.mockResolvedValue({
        id: 1,
        displayName: 'Test User',
        email: 'test@test.com',
        role: { name: 'employee' }
      });

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'valid-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    test('should return 400 when token missing', async () => {
      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 503 when Azure AD not configured', async () => {
      process.env.AZURE_AD_TENANT_ID = '';
      process.env.AZURE_AD_CLIENT_ID = '';

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'token' })
        .expect(503);

      expect(response.body.success).toBe(false);
    });

    test('should handle validation errors', async () => {
      handleTokenValidation.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users', () => {
    test('should return all users for superadmin', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, email: 'user1@example.com', display_name: 'User 1', role_name: 'employee', role_id: 1 }
        ]
      });

      const response = await request(app)
        .get('/api/auth/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
    });

    test('should return 403 for non-superadmin', async () => {
      app.use((req, res, next) => {
        req.user = { id: 1, role: { name: 'employee' } };
        next();
      });

      const response = await request(app)
        .get('/api/auth/users')
        .expect(403);
    });
  });

  describe('PUT /users/:id/manager', () => {
    test('should update user manager', async () => {
      const mockUser = { id: 1, email: 'user@example.com', displayName: 'User' };
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ id: 10, email: 'manager@example.com' })
        .mockResolvedValueOnce(mockUser);

      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when user not found', async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/auth/users/999/manager')
        .send({ managerId: 10 })
        .expect(404);
    });

    test('should return 404 when manager not found', async () => {
      const mockUser = { id: 1 };
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: 999 })
        .expect(404);
    });

    test('should handle null managerId', async () => {
      const mockUser = { id: 1 };
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);

      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: null })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /users/:id/role', () => {
    test('should update user role', async () => {
      const mockRole = { id: 2, name: 'employee' };
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        displayName: 'User',
        role: { name: 'employee' },
        roleId: 2,
        updateRole: jest.fn().mockResolvedValue(true)
      };

      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);

      const { updateUserRoleWithManager } = require('../../routes/auth-role-helpers');
      updateUserRoleWithManager.mockResolvedValue();

      pool.query
        .mockResolvedValueOnce({ rows: [{ name: 'employee' }] })
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 400 when roleId missing', async () => {
      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({})
        .expect(400);
    });

    test('should return 404 when role not found', async () => {
      Role.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 999 })
        .expect(404);
    });
  });

  describe('GET /logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .get('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle logout errors', async () => {
      app.use((req, res, next) => {
        req.logout = jest.fn((callback) => callback(new Error('Logout error')));
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
});


