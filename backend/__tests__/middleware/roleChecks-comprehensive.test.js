const request = require('supertest');
const express = require('express');
const { createRoleCheckMiddleware, isFinance, isHR, isManager, isSuperAdmin } = require('../../middleware/roleChecks');
const User = require('../../models/User');

jest.mock('../../models/User');

describe('Role Checks Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  describe('createRoleCheckMiddleware', () => {
    test('should allow access for correct role', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'finance' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      const financeCheck = createRoleCheckMiddleware('finance');
      app.get('/test', financeCheck, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should deny access for incorrect role', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'employee' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      const financeCheck = createRoleCheckMiddleware('finance');
      app.get('/test', financeCheck, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should return 401 when not authenticated', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(false);
        next();
      });

      const financeCheck = createRoleCheckMiddleware('finance');
      app.get('/test', financeCheck, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle user not found', async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 999 };
        next();
      });

      const financeCheck = createRoleCheckMiddleware('finance');
      app.get('/test', financeCheck, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should handle user without role', async () => {
      const mockUser = {
        id: 1,
        role: null
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      const financeCheck = createRoleCheckMiddleware('finance');
      app.get('/test', financeCheck, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should handle database errors', async () => {
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      const financeCheck = createRoleCheckMiddleware('finance');
      app.get('/test', financeCheck, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle user with _id instead of id', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'finance' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { _id: 1 };
        next();
      });

      const financeCheck = createRoleCheckMiddleware('finance');
      app.get('/test', financeCheck, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('isFinance', () => {
    test('should allow finance role', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'finance' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      app.get('/test', isFinance, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('isHR', () => {
    test('should allow hr role', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'hr' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      app.get('/test', isHR, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('isManager', () => {
    test('should allow manager role', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'manager' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      app.get('/test', isManager, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('isSuperAdmin', () => {
    test('should allow superadmin role', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'superadmin' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      app.get('/test', isSuperAdmin, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .get('/test')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});


