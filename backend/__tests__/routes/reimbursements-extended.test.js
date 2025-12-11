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

jest.mock('../../middleware/upload', () => ({
  any: jest.fn(() => (req, res, next) => {
    req.files = [];
    next();
  })
}));

describe('Reimbursements Routes Extended', () => {
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

  describe('POST /api/reimbursements', () => {
    test('should create reimbursement with items', async () => {
      mockClient.query
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rows: [{ id: 100 }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/reimbursements')
        .send({
          data: JSON.stringify({
            department_id: 1,
            cost_center_id: 1,
            project_id: 1,
            description: 'Test reimbursement',
            items: [{
              expense_type: 'travel',
              amount: 100,
              expense_date: '2024-01-01',
              description: 'Travel expense'
            }]
          })
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return error when items array is empty', async () => {
      mockClient.query.mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/reimbursements')
        .send({
          data: JSON.stringify({
            items: []
          })
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return error when total amount is invalid', async () => {
      mockClient.query.mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/reimbursements')
        .send({
          data: JSON.stringify({
            items: [{
              expense_type: 'travel',
              amount: -100,
              expense_date: '2024-01-01'
            }]
          })
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle JSON parse errors gracefully', async () => {
      mockClient.query.mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/reimbursements')
        .send({
          data: 'invalid json{'
        })
        .expect(200); // Should use raw body

      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/reimbursements/:id', () => {
    test('should return reimbursement details', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 1,
            total_amount: 1000,
            status: 'pending'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            expense_type: 'travel',
            amount: 1000
          }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/reimbursements/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should return 404 when reimbursement not found', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/reimbursements/999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});


