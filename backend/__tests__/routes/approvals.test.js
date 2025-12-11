const request = require('supertest');
const express = require('express');
const approvalsRouter = require('../../routes/approvals');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

describe('Approvals Routes', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'manager' } };
      next();
    });
    app.use('/api/approvals', approvalsRouter);

    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
    jest.clearAllMocks();
  });

  describe('GET /api/approvals/manager/pending', () => {
    test('should return pending approvals for manager', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          item_id: 1,
          reimbursement_id: 100,
          amount: 500,
          status: 'pending'
        }]
      });

      const response = await request(app)
        .get('/api/approvals/manager/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /api/approvals/manager/approved', () => {
    test('should return approved items for manager', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          item_id: 1,
          status: 'approved_by_manager'
        }]
      });

      const response = await request(app)
        .get('/api/approvals/manager/approved')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/approvals/manager/approve', () => {
    test('should approve item', async () => {
      mockClient.query
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 100,
            status: 'pending'
          }]
        })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/approvals/manager/approve')
        .send({ itemId: 1, comments: 'Approved' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return error when itemId is missing', async () => {
      const response = await request(app)
        .post('/api/approvals/manager/approve')
        .send({ comments: 'Approved' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/approvals/manager/reject', () => {
    test('should reject item', async () => {
      mockClient.query
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 100,
            status: 'pending'
          }]
        })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/approvals/manager/reject')
        .send({ itemId: 1, comments: 'Rejected' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return error when comments are missing', async () => {
      const response = await request(app)
        .post('/api/approvals/manager/reject')
        .send({ itemId: 1 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});


