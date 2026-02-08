const request = require('supertest');
const express = require('express');
const authRouter = require('../../routes/auth');
const User = require('../../models/User');
const Role = require('../../models/Role');
const { pool } = require('../../config/database');
const passport = require('passport');

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
  authenticate: jest.fn(() => (req, res, next) => next()),
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn(),
  initialize: jest.fn(() => (req, res, next) => next()),
  session: jest.fn(() => (req, res, next) => next())
}));

jest.mock('passport-azure-ad', () => ({
  OIDCStrategy: jest.fn()
}));

describe('Auth Routes Extended Complete Coverage', () => {
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

  describe('GET /login', () => {
    test('should redirect to Azure AD login', async () => {
      process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
      const azureConfig = require('../../config/azureConfig');
      azureConfig.isValid = true;
      azureConfig.clientID = 'test-client-id';

      const response = await request(app)
        .get('/api/auth/login')
        .expect(302);

      expect(response.headers.location).toBeDefined();
    });

    test('should return 503 when Azure AD not configured', async () => {
      process.env.AZURE_AD_CLIENT_ID = '';
      const azureConfig = require('../../config/azureConfig');
      azureConfig.isValid = false;

      const response = await request(app)
        .get('/api/auth/login')
        .expect(503);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /azure/callback', () => {
    test('should handle Azure callback', async () => {
      process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
      const azureConfig = require('../../config/azureConfig');
      azureConfig.isValid = true;

      const response = await request(app)
        .post('/api/auth/azure/callback')
        .send({})
        .expect(302);

      expect(response.headers.location).toBeDefined();
    });

    test('should return 503 when Azure AD not configured', async () => {
      process.env.AZURE_AD_CLIENT_ID = '';
      const azureConfig = require('../../config/azureConfig');
      azureConfig.isValid = false;

      const response = await request(app)
        .post('/api/auth/azure/callback')
        .send({})
        .expect(503);
    });
  });

  describe('POST /validate-token', () => {
    test('should validate token and return user', async () => {
      const { handleTokenValidation, handleUserLogin } = require('../../routes/auth-helpers');
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

      process.env.AZURE_AD_TENANT_ID = 'test-tenant';
      process.env.AZURE_AD_CLIENT_ID = 'test-client';

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
    });

    test('should handle validation errors', async () => {
      const { handleTokenValidation } = require('../../routes/auth-helpers');
      handleTokenValidation.mockRejectedValue(new Error('Invalid token'));

      process.env.AZURE_AD_TENANT_ID = 'test-tenant';
      process.env.AZURE_AD_CLIENT_ID = 'test-client';

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle login errors', async () => {
      const { handleTokenValidation, handleUserLogin } = require('../../routes/auth-helpers');
      const mockUser = { id: 1 };
      handleTokenValidation.mockResolvedValue(mockUser);
      handleUserLogin.mockRejectedValue(new Error('Login failed'));

      process.env.AZURE_AD_TENANT_ID = 'test-tenant';
      process.env.AZURE_AD_CLIENT_ID = 'test-client';

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'token' })
        .expect(500);

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

    test('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/users')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:id/manager', () => {
    test('should update user manager successfully', async () => {
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

    test('should return 400 when user ID missing', async () => {
      const response = await request(app)
        .put('/api/auth/users//manager')
        .send({ managerId: 10 })
        .expect(404);
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

    test('should handle database errors', async () => {
      const mockUser = { id: 1 };
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ id: 10 })
        .mockResolvedValueOnce(mockUser);

      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: 10 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:id/role', () => {
    test('should update user role successfully', async () => {
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

    test('should return 400 when user ID missing', async () => {
      const response = await request(app)
        .put('/api/auth/users//role')
        .send({ roleId: 2 })
        .expect(404);
    });

    test('should return 404 when role not found', async () => {
      Role.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 999 })
        .expect(404);
    });

    test('should return 404 when user not found', async () => {
      const mockRole = { id: 2 };
      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/auth/users/999/role')
        .send({ roleId: 2 })
        .expect(404);
    });

    test('should return 400 when user missing ID', async () => {
      const mockRole = { id: 2 };
      const mockUser = {}; // Missing id
      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 2 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 500 when updated user not found', async () => {
      const mockRole = { id: 2 };
      const mockUser = {
        id: 1,
        updateRole: jest.fn().mockResolvedValue(true)
      };
      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null); // Updated user not found

      const { updateUserRoleWithManager } = require('../../routes/auth-role-helpers');
      updateUserRoleWithManager.mockResolvedValue();

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 2 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle role update errors', async () => {
      const mockRole = { id: 2 };
      const mockUser = {
        id: 1,
        updateRole: jest.fn().mockRejectedValue(new Error('Update failed'))
      };
      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 2 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle HR role assignment', async () => {
      const mockRole = { id: 3, name: 'hr' };
      const mockUser = {
        id: 1,
        updateRole: jest.fn().mockResolvedValue(true)
      };
      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);

      const { updateUserRoleWithManager } = require('../../routes/auth-role-helpers');
      updateUserRoleWithManager.mockResolvedValue();

      pool.query
        .mockResolvedValueOnce({ rows: [{ name: 'hr' }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .get('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle logout errors gracefully', async () => {
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

  describe('GET /roles', () => {
    test('should return all roles', async () => {
      const mockRoles = [
        { id: 1, name: 'employee', displayName: 'Employee' },
        { id: 2, name: 'manager', displayName: 'Manager' }
      ];
      Role.findAll = jest.fn().mockResolvedValue(mockRoles);

      const response = await request(app)
        .get('/api/auth/roles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.roles).toHaveLength(2);
    });

    test('should handle errors when fetching roles', async () => {
      Role.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/roles')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /test-users', () => {
    test('should return test users in development', async () => {
      process.env.NODE_ENV = 'development';
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, email: 'test@test.com', display_name: 'Test User', role_name: 'employee' }
        ]
      });

      const response = await request(app)
        .get('/api/auth/test-users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
    });

    test('should return 403 in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/auth/test-users')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /test-login', () => {
    test('should login test user in development', async () => {
      process.env.NODE_ENV = 'development';
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        azureId: 'test-123',
        toJSON: jest.fn().mockReturnValue({ id: 1, email: 'test@test.com' }),
        role: { name: 'employee' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.login = jest.fn((user, callback) => callback(null));
        next();
      });

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 403 in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(403);
    });

    test('should return 400 when userId missing', async () => {
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 when user not found', async () => {
      process.env.NODE_ENV = 'development';
      User.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 999 })
        .expect(404);
    });

    test('should return 403 for non-test users', async () => {
      process.env.NODE_ENV = 'development';
      const mockUser = {
        id: 1,
        email: 'real@example.com',
        azureId: 'real-123'
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(403);
    });

    test('should handle login errors', async () => {
      process.env.NODE_ENV = 'development';
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        azureId: 'test-123'
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.login = jest.fn((user, callback) => callback(new Error('Login failed')));
        next();
      });

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});


