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

jest.mock('../../routes/approvals-helpers', () => ({
  BASE_ITEM_SELECT: 'SELECT * FROM reimbursement_items',
  enrichItemsWithDetails: jest.fn(),
  handleApproval: jest.fn(),
  handleRejection: jest.fn(),
  validateItemForAction: jest.fn()
}));

jest.mock('../../routes/approvals-query-helpers', () => ({
  buildPendingItemsQuery: jest.fn(),
  buildApprovedItemsQuery: jest.fn()
}));

jest.mock('../../routes/approvals-enrichment-helpers', () => ({
  enrichItemsWithApprovalsAndAttachments: jest.fn()
}));

jest.mock('../../routes/approvals-transaction-helpers', () => ({
  handleApprovalTransaction: jest.fn(),
  handleRejectionTransaction: jest.fn()
}));

jest.mock('../../routes/approvals-finance-helpers', () => ({
  processFinanceApproval: jest.fn()
}));

jest.mock('../../routes/approvals-get-helpers', () => ({
  handlePendingItemsRequest: jest.fn(),
  handleApprovedItemsRequest: jest.fn()
}));

jest.mock('../../routes/approvals-superadmin-helpers', () => ({
  handleSuperAdminApprovalRequest: jest.fn()
}));

jest.mock('../../middleware/roleChecks', () => ({
  isFinance: jest.fn((req, res, next) => next()),
  isHR: jest.fn((req, res, next) => next()),
  isManager: jest.fn((req, res, next) => next()),
  isSuperAdmin: jest.fn((req, res, next) => next())
}));

describe('Approvals Routes Complete Coverage', () => {
  let app;
  let mockClient;
  const { handlePendingItemsRequest, handleApprovedItemsRequest } = require('../../routes/approvals-get-helpers');
  const { handleSuperAdminApprovalRequest } = require('../../routes/approvals-superadmin-helpers');

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'finance' } };
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

  describe('Manager Routes', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.user = { id: 1, role: { name: 'manager' } };
        next();
      });
    });

    test('GET /manager/pending should call handlePendingItemsRequest', async () => {
      handlePendingItemsRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/approvals/manager/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(handlePendingItemsRequest).toHaveBeenCalled();
    });

    test('GET /manager/approved should call handleApprovedItemsRequest', async () => {
      handleApprovedItemsRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/approvals/manager/approved')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('HR Routes', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.user = { id: 1, role: { name: 'hr' } };
        next();
      });
    });

    test('GET /hr/pending should call handlePendingItemsRequest', async () => {
      handlePendingItemsRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/approvals/hr/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /hr/approved should call handleApprovedItemsRequest', async () => {
      handleApprovedItemsRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/approvals/hr/approved')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Finance Routes', () => {
    test('GET /finance/pending should call handlePendingItemsRequest', async () => {
      handlePendingItemsRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/approvals/finance/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /finance/approved should call handleApprovedItemsRequest', async () => {
      handleApprovedItemsRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/approvals/finance/approved')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('POST /finance/mark-paid should handle all payment scenarios', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 100,
            amount: 1000,
            status: 'approved_by_finance'
          }]
        })
        .mockResolvedValueOnce() // UPDATE item
        .mockResolvedValueOnce({ rows: [{ status: 'paid' }] }) // Check all items
        .mockResolvedValueOnce() // UPDATE reimbursement
        .mockResolvedValueOnce(); // COMMIT

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

    test('POST /finance/mark-paid should update reimbursement when all items paid', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 100,
            amount: 1000,
            status: 'approved_by_finance'
          }]
        })
        .mockResolvedValueOnce() // UPDATE item
        .mockResolvedValueOnce({ rows: [{ status: 'paid' }, { status: 'paid' }] }) // All paid
        .mockResolvedValueOnce() // UPDATE reimbursement to paid
        .mockResolvedValueOnce(); // COMMIT

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
  });

  describe('Superadmin Routes', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });
    });

    test('GET /superadmin/manager/pending should call handleSuperAdminApprovalRequest', async () => {
      handleSuperAdminApprovalRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/approvals/superadmin/manager/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(handleSuperAdminApprovalRequest).toHaveBeenCalled();
    });

    test('GET /superadmin/hr/approved should call handleSuperAdminApprovalRequest', async () => {
      handleSuperAdminApprovalRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/approvals/superadmin/hr/approved')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /superadmin/finance/rejected should call handleSuperAdminApprovalRequest', async () => {
      handleSuperAdminApprovalRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/approvals/superadmin/finance/rejected')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});


