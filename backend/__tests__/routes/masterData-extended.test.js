const request = require('supertest');
const express = require('express');
const masterDataRouter = require('../../routes/masterData');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Master Data Routes Extended', () => {
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

  describe('Cost Centers Routes', () => {
    test('should get cost centers', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'CC001', code: 'CC001', department_id: 1 }]
      });

      const response = await request(app)
        .get('/api/master-data/cost-centers')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should create cost center', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'New CC', code: 'NCC001', department_id: 1 }]
      });

      const response = await request(app)
        .post('/api/master-data/cost-centers')
        .send({
          name: 'New CC',
          code: 'NCC001',
          department_id: 1
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update cost center', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Updated CC', code: 'UCC001' }]
      });

      const response = await request(app)
        .put('/api/master-data/cost-centers/1')
        .send({
          name: 'Updated CC',
          code: 'UCC001'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should delete cost center', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'inactive' }] });

      const response = await request(app)
        .delete('/api/master-data/cost-centers/1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Projects Routes', () => {
    test('should get projects', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Project A', code: 'PRJ001' }]
      });

      const response = await request(app)
        .get('/api/master-data/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should create project', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'New Project', code: 'NPRJ001' }]
      });

      const response = await request(app)
        .post('/api/master-data/projects')
        .send({
          name: 'New Project',
          code: 'NPRJ001'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update project', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Updated Project', code: 'UPRJ001' }]
      });

      const response = await request(app)
        .put('/api/master-data/projects/1')
        .send({
          name: 'Updated Project',
          code: 'UPRJ001'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should delete project', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'inactive' }] });

      const response = await request(app)
        .delete('/api/master-data/projects/1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});


