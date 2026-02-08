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

describe('Auth Routes Edge Cases', () => {
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

  describe('isSuperAdmin middleware edge cases', () => {
    test('should handle user with _id instead of id', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { _id: 1 };
        next();
      });

      const mockUser = {
        id: 1,
        role: { name: 'superadmin' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      pool.query.mockResolvedValue({
        rows: [{ id: 1, email: 'user@example.com' }]
      });

      const response = await request(app)
        .get('/api/auth/users')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle user not found in isSuperAdmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 999 };
        next();
      });

      User.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/users')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle user without role in isSuperAdmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      const mockUser = {
        id: 1,
        role: null
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/users')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should handle database errors in isSuperAdmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/users')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:id/role edge cases', () => {
    test('should handle updateUserRoleWithManager errors', async () => {
      const mockRole = { id: 2, name: 'employee' };
      const mockUser = {
        id: 1,
        updateRole: jest.fn().mockResolvedValue(true)
      };
      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);

      const { updateUserRoleWithManager } = require('../../routes/auth-role-helpers');
      updateUserRoleWithManager.mockRejectedValue(new Error('Role update failed'));

      pool.query.mockResolvedValue({ rows: [{ name: 'employee' }] });

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 2 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle employee role assignment with manager', async () => {
      const mockRole = { id: 2, name: 'employee' };
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

    test('should handle manager role assignment', async () => {
      const mockRole = { id: 4, name: 'manager' };
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
        .mockResolvedValueOnce({ rows: [{ name: 'manager' }] })
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 4 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /users/:id/manager edge cases', () => {
    test('should handle database update errors', async () => {
      const mockUser = { id: 1 };
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ id: 10 })
        .mockResolvedValueOnce(mockUser);

      pool.query.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: 10 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle user fetch errors after update', async () => {
      const mockUser = { id: 1 };
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ id: 10 })
        .mockRejectedValueOnce(new Error('Fetch failed'));

      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: 10 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});


