const request = require('supertest');
const express = require('express');
const authRouter = require('../../routes/auth');
const User = require('../../models/User');
const Role = require('../../models/Role');
const { pool } = require('../../config/database');

jest.mock('../../models/User');
jest.mock('../../models/Role');
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Auth Routes Comprehensive', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/auth/roles', () => {
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

  describe('GET /api/auth/test-users', () => {
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

  describe('POST /api/auth/test-login', () => {
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

    test('should return 400 when userId is missing', async () => {
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
  });

  describe('GET /api/auth/users', () => {
    test('should return all users for superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

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
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'employee' } };
        next();
      });

      const response = await request(app)
        .get('/api/auth/users')
        .expect(403);
    });
  });

  describe('PUT /api/auth/users/:id/manager', () => {
    test('should update user manager', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

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

    test('should return 400 when user ID is missing', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const response = await request(app)
        .put('/api/auth/users//manager')
        .send({ managerId: 10 })
        .expect(404);
    });

    test('should return 404 when user not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      User.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/auth/users/999/manager')
        .send({ managerId: 10 })
        .expect(404);
    });

    test('should return 404 when manager not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const mockUser = { id: 1 };
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: 999 })
        .expect(404);
    });
  });

  describe('PUT /api/auth/users/:id/role', () => {
    test('should update user role', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

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

    test('should return 400 when roleId is missing', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({})
        .expect(400);
    });

    test('should return 404 when role not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      Role.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 999 })
        .expect(404);
    });

    test('should handle HR role assignment', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const mockRole = { id: 3, name: 'hr' };
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        displayName: 'User',
        role: { name: 'hr' },
        roleId: 3,
        updateRole: jest.fn().mockResolvedValue(true)
      };

      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);

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

  describe('GET /api/auth/logout', () => {
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
});


