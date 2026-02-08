const request = require('supertest');
const express = require('express');
const masterDataRouter = require('../../routes/masterData');
const User = require('../../models/User');
const { pool } = require('../../config/database');

jest.mock('../../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../routes/masterData-crud-helpers', () => ({
  handleGetRequest: jest.fn(),
  handlePostRequest: jest.fn(),
  handlePutRequest: jest.fn(),
  handleDeleteRequest: jest.fn()
}));

describe('Master Data Routes Edge Cases', () => {
  let app;
  const { handleGetRequest, handlePostRequest, handlePutRequest, handleDeleteRequest } = require('../../routes/masterData-crud-helpers');

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'superadmin' } };
      req.session = { passport: { user: 1 } };
      next();
    });
    app.use('/api/master-data', masterDataRouter);
    jest.clearAllMocks();
  });

  describe('isSuperAdminOrHR middleware edge cases', () => {
    test('should handle user with _id instead of id', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { _id: 1 };
        req.session = { passport: { user: 1 } };
        next();
      });

      const mockUser = {
        id: 1,
        role: { name: 'hr' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      handlePostRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 1 } });
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle user from session.passport.user', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = {};
        req.session = { passport: { user: 1 } };
        next();
      });

      const mockUser = {
        id: 1,
        role: { name: 'hr' }
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      handlePostRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 1 } });
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle user ID not found in session', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = {};
        req.session = {};
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle user not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 999 };
        req.session = { passport: { user: 999 } };
        next();
      });

      User.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle database errors in middleware', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = { passport: { user: 1 } };
        next();
      });

      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle user without role', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = { passport: { user: 1 } };
        next();
      });

      const mockUser = {
        id: 1,
        role: null
      };
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Cost Centers POST with postProcess', () => {
    test('should handle postProcess errors', async () => {
      handlePostRequest.mockImplementation(async (req, res) => {
        try {
          const deptResult = await pool.query('SELECT name FROM departments WHERE id = $1', [req.body.department_id]);
          throw new Error('PostProcess error');
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });

      pool.query.mockRejectedValue(new Error('PostProcess error'));

      const response = await request(app)
        .post('/api/master-data/cost-centers')
        .send({ name: 'Dev', code: 'DEV', department_id: 1 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle missing department in postProcess', async () => {
      handlePostRequest.mockImplementation(async (req, res) => {
        const deptResult = await pool.query('SELECT name FROM departments WHERE id = $1', [req.body.department_id]);
        const data = { id: 1, name: 'Dev', code: 'DEV' };
        data.department_name = deptResult.rows[0]?.name || null;
        res.json({ success: true, data });
      });

      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post('/api/master-data/cost-centers')
        .send({ name: 'Dev', code: 'DEV', department_id: 999 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.department_name).toBeNull();
    });
  });

  describe('Cost Centers PUT with postProcess', () => {
    test('should handle postProcess in PUT request', async () => {
      handlePutRequest.mockImplementation(async (req, res) => {
        const deptResult = await pool.query('SELECT name FROM departments WHERE id = $1', [req.body.department_id]);
        const data = { id: 1, name: 'Updated Dev', code: 'DEV' };
        data.department_name = deptResult.rows[0]?.name || null;
        res.json({ success: true, data });
      });

      pool.query.mockResolvedValue({ rows: [{ name: 'IT' }] });

      const response = await request(app)
        .put('/api/master-data/cost-centers/1')
        .send({ name: 'Updated Dev', code: 'DEV', department_id: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.department_name).toBe('IT');
    });
  });
});


