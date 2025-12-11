const request = require('supertest');
const express = require('express');
const masterDataRouter = require('../../routes/masterData');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Master Data Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'superadmin' } };
      next();
    });
    app.use('/api/master-data', masterDataRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/master-data/departments', () => {
    test('should return departments', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'IT', code: 'IT001', status: 'active' }]
      });

      const response = await request(app)
        .get('/api/master-data/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should handle search parameter', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/master-data/departments?search=IT')
        .expect(200);
    });

    test('should handle status filter', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/master-data/departments?status=active')
        .expect(200);
    });
  });

  describe('POST /api/master-data/departments', () => {
    test('should create department', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'HR', code: 'HR001', status: 'active' }]
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'HR', code: 'HR001' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return error when name is missing', async () => {
      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ code: 'HR001' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/master-data/departments/:id', () => {
    test('should update department', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Updated HR', code: 'HR001', status: 'active' }]
      });

      const response = await request(app)
        .put('/api/master-data/departments/1')
        .send({ name: 'Updated HR', code: 'HR001' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/master-data/departments/:id', () => {
    test('should soft delete department', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'inactive' }] });

      const response = await request(app)
        .delete('/api/master-data/departments/1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});


