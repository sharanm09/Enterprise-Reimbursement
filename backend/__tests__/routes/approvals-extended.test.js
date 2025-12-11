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

describe('Approvals Routes Extended', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'hr' } };
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

  describe('HR Routes', () => {
    test('should get HR pending approvals', async () => {
      pool.query.mockResolvedValue({
        rows: [{ item_id: 1, status: 'approved_by_manager' }]
      });

      const response = await request(app)
        .get('/api/approvals/hr/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should approve item as HR', async () => {
      mockClient.query
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 100,
            status: 'approved_by_manager'
          }]
        })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/approvals/hr/approve')
        .send({ itemId: 1, comments: 'Approved by HR' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should reject item as HR', async () => {
      mockClient.query
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 100,
            status: 'approved_by_manager'
          }]
        })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/approvals/hr/reject')
        .send({ itemId: 1, comments: 'Rejected by HR' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should get HR approved items', async () => {
      pool.query.mockResolvedValue({
        rows: [{ item_id: 1, status: 'approved_by_hr' }]
      });

      const response = await request(app)
        .get('/api/approvals/hr/approved')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Finance Routes', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'finance' } };
        next();
      });
    });

    test('should get finance pending approvals', async () => {
      pool.query.mockResolvedValue({
        rows: [{ item_id: 1, status: 'approved_by_hr' }]
      });

      const response = await request(app)
        .get('/api/approvals/finance/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should approve item as finance', async () => {
      mockClient.query
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 100,
            status: 'approved_by_hr'
          }]
        })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({ rows: [{ status: 'approved_by_finance' }] })
        .mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/approvals/finance/approve')
        .send({ itemId: 1, comments: 'Approved by Finance' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should mark item as paid', async () => {
      mockClient.query
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 100,
            amount: 1000,
            status: 'approved_by_finance'
          }]
        })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({ rows: [{ status: 'paid' }] })
        .mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 1000,
          tdsAmount: 0,
          finalAmount: 1000
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should validate final amount calculation', async () => {
      mockClient.query
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 100,
            amount: 1000,
            status: 'approved_by_finance'
          }]
        });

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 1000,
          tdsAmount: 100,
          finalAmount: 800 // Wrong: should be 900
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Superadmin Routes', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });
    });

    test('should get superadmin manager pending approvals', async () => {
      pool.query.mockResolvedValue({
        rows: [{ item_id: 1, status: 'pending' }]
      });

      const response = await request(app)
        .get('/api/approvals/superadmin/manager/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should get superadmin hr approved approvals', async () => {
      pool.query.mockResolvedValue({
        rows: [{ item_id: 1, status: 'approved_by_hr' }]
      });

      const response = await request(app)
        .get('/api/approvals/superadmin/hr/approved')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should get superadmin finance rejected approvals', async () => {
      pool.query.mockResolvedValue({
        rows: [{ item_id: 1, status: 'rejected_by_finance' }]
      });

      const response = await request(app)
        .get('/api/approvals/superadmin/finance/rejected')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});


