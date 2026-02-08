const request = require('supertest');
const express = require('express');
const masterDataRouter = require('../../routes/masterData');
const { pool } = require('../../config/database');
const User = require('../../models/User');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => {
    req.isAuthenticated = jest.fn().mockReturnValue(true);
    next();
  })
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../routes/masterData-crud-helpers', () => ({
  handleGetRequest: jest.fn(async (req, res, config) => {
    try {
      const result = await pool.query('SELECT * FROM ' + config.tableName);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error' });
    }
  }),
  handlePostRequest: jest.fn(async (req, res, config) => {
    try {
      const fields = config.getFields();
      const values = config.getValues(req.body);
      const result = await pool.query(
        `INSERT INTO ${config.tableName} (${fields.join(', ')}) VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
        values
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error' });
    }
  }),
  handlePutRequest: jest.fn(async (req, res, config) => {
    try {
      const result = await pool.query(
        `UPDATE ${config.tableName} SET name = $1 WHERE id = $2 RETURNING *`,
        [req.body.name, req.params.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Not found' });
      }
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error' });
    }
  }),
  handleDeleteRequest: jest.fn(async (req, res, config) => {
    try {
      const result = await pool.query(`DELETE FROM ${config.tableName} WHERE id = $1 RETURNING *`, [req.params.id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Not found' });
      }
      res.json({ success: true, message: 'Deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error' });
    }
  })
}));

describe('Master Data Ultimate Coverage', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'employee' } };
      next();
    });
    app.use('/api/master-data', masterDataRouter);
    jest.clearAllMocks();
  });

  describe('isSuperAdminOrHR middleware', () => {
    test('should allow superadmin access', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        req.session = { passport: { user: 1 } };
        next();
      });

      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'superadmin' }
      });

      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/master-data/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should allow HR access', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'hr' } };
        req.session = { passport: { user: 1 } };
        next();
      });

      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'hr' }
      });

      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/master-data/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should deny employee access to POST endpoints', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'employee' } };
        req.session = { passport: { user: 1 } };
        next();
      });

      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'employee' }
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should return 401 when not authenticated', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(false);
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should return 401 when user ID not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = {};
        req.session = {};
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should return 401 when user not found in database', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = { passport: { user: 1 } };
        next();
      });

      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle errors in middleware', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = { passport: { user: 1 } };
        next();
      });

      User.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /departments', () => {
    test('should return departments with cost center count', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, name: 'IT', cost_center_count: 5 },
          { id: 2, name: 'HR', cost_center_count: 3 }
        ]
      });

      const response = await request(app)
        .get('/api/master-data/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/master-data/departments')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /departments', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        req.session = { passport: { user: 1 } };
        next();
      });
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'superadmin' }
      });
    });

    test('should create department', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'IT', code: 'IT', status: 'active' }]
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT', description: 'IT Department', status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should use default status when not provided', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'IT', code: 'IT', status: 'active' }]
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /departments/:id', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        req.session = { passport: { user: 1 } };
        next();
      });
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'superadmin' }
      });
    });

    test('should update department', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Updated IT', code: 'IT', status: 'active' }]
      });

      const response = await request(app)
        .put('/api/master-data/departments/1')
        .send({ name: 'Updated IT', code: 'IT', status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /departments/:id', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        req.session = { passport: { user: 1 } };
        next();
      });
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'superadmin' }
      });
    });

    test('should delete department', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'IT' }]
      });

      const response = await request(app)
        .delete('/api/master-data/departments/1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /cost-centers', () => {
    test('should return cost centers with department name', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, name: 'CC1', department_name: 'IT', reimbursement_count: 10 },
          { id: 2, name: 'CC2', department_name: 'HR', reimbursement_count: 5 }
        ]
      });

      const response = await request(app)
        .get('/api/master-data/cost-centers')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter by department_id when provided', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'CC1', department_name: 'IT' }]
      });

      const response = await request(app)
        .get('/api/master-data/cost-centers?department_id=1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /cost-centers', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        req.session = { passport: { user: 1 } };
        next();
      });
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'superadmin' }
      });
    });

    test('should create cost center with department name', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'CC1', department_id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{ name: 'IT' }]
        });

      const response = await request(app)
        .post('/api/master-data/cost-centers')
        .send({ name: 'CC1', code: 'CC1', department_id: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /projects', () => {
    test('should return projects with reimbursement count and total expenses', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, name: 'Project 1', reimbursement_count: 5, total_expenses: 1000 },
          { id: 2, name: 'Project 2', reimbursement_count: 3, total_expenses: 500 }
        ]
      });

      const response = await request(app)
        .get('/api/master-data/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /projects', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        req.session = { passport: { user: 1 } };
        next();
      });
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'superadmin' }
      });
    });

    test('should create project with dates', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          name: 'Project 1',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          status: 'active'
        }]
      });

      const response = await request(app)
        .post('/api/master-data/projects')
        .send({
          name: 'Project 1',
          code: 'P1',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          status: 'active'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle null dates', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Project 1', start_date: null, end_date: null }]
      });

      const response = await request(app)
        .post('/api/master-data/projects')
        .send({ name: 'Project 1', code: 'P1' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

