const request = require('supertest');
const express = require('express');
const reimbursementsRouter = require('../../routes/reimbursements');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

describe('Reimbursements Routes', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1 };
      req.files = [];
      next();
    });
    app.use('/api/reimbursements', reimbursementsRouter);

    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
    jest.clearAllMocks();
  });

  describe('GET /api/reimbursements', () => {
    test('should return reimbursements list', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          user_id: 1,
          total_amount: 1000,
          status: 'pending',
          created_at: '2024-01-01'
        }]
      });

      const response = await request(app)
        .get('/api/reimbursements')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should handle query parameters', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await request(app)
        .get('/api/reimbursements?status=pending&limit=10')
        .expect(200);
    });
  });

  describe('GET /api/reimbursements/departments', () => {
    test('should return departments', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'IT', code: 'IT001' }]
      });

      const response = await request(app)
        .get('/api/reimbursements/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/reimbursements/cost-centers', () => {
    test('should return cost centers', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'CC001', code: 'CC001' }]
      });

      const response = await request(app)
        .get('/api/reimbursements/cost-centers')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reimbursements/projects', () => {
    test('should return projects', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Project A', code: 'PRJ001' }]
      });

      const response = await request(app)
        .get('/api/reimbursements/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reimbursements/expense-categories', () => {
    test('should return expense categories', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Travel', code: 'TRV' }]
      });

      const response = await request(app)
        .get('/api/reimbursements/expense-categories')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});


