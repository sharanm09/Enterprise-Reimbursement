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

jest.mock('../../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => {
    req.isAuthenticated = jest.fn().mockReturnValue(true);
    next();
  })
}));

jest.mock('../../middleware/roleChecks', () => ({
  isFinance: jest.fn((req, res, next) => {
    const userRole = req.user?.role?.name || 'employee';
    if (userRole === 'finance') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  }),
  isHR: jest.fn((req, res, next) => {
    const userRole = req.user?.role?.name || 'employee';
    if (userRole === 'hr') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  }),
  isManager: jest.fn((req, res, next) => {
    const userRole = req.user?.role?.name || 'employee';
    if (userRole === 'manager') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  }),
  isSuperAdmin: jest.fn((req, res, next) => {
    const userRole = req.user?.role?.name || 'employee';
    if (userRole === 'superadmin') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  })
}));

jest.mock('../../routes/approvals-get-helpers', () => ({
  handlePendingItemsRequest: jest.fn(async (req, res, role, userId) => {
    res.json({ success: true, data: [] });
  }),
  handleApprovedItemsRequest: jest.fn(async (req, res, role, userId, approvalLevel) => {
    res.json({ success: true, data: [] });
  })
}));

jest.mock('../../routes/approvals-transaction-helpers', () => ({
  handleApprovalTransaction: jest.fn(async (req, res, config) => {
    res.json({ success: true, message: config.successMessage });
  }),
  handleRejectionTransaction: jest.fn(async (req, res, config) => {
    res.json({ success: true, message: config.successMessage });
  })
}));

jest.mock('../../routes/approvals-superadmin-helpers', () => ({
  handleSuperAdminApprovalRequest: jest.fn(async (req, res, role) => {
    res.json({ success: true, data: [] });
  })
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('Approvals Comprehensive Coverage', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'employee' } };
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

  describe('POST /finance/mark-paid', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'finance' } };
        next();
      });
    });

    test('should mark item as paid successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 10,
            amount: '100.00',
            total_amount: '100.00',
            user_id: 1
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'paid' }]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // COMMIT

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should return 400 when itemId is missing', async () => {
      mockClient.query.mockResolvedValueOnce(); // BEGIN

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Item ID is required');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should return 404 when item not found', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // Item query

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 999,
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Item not found or not approved by finance');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should return 404 when item not approved by finance', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            status: 'pending',
            reimbursement_id: 10
          }]
        });

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should validate final amount calculation', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 10,
            amount: '100.00',
            total_amount: '100.00',
            user_id: 1
          }]
        });

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: 95 // Wrong: should be 90
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Final Amount validation failed');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should use invoice amount when paidAmount not provided', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 10,
            amount: '100.00',
            total_amount: '100.00',
            user_id: 1
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'paid' }]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // COMMIT

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle zero TDS amount', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 10,
            amount: '100.00',
            total_amount: '100.00',
            user_id: 1
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'paid' }]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // COMMIT

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: 0,
          finalAmount: 100
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should update reimbursement status to paid when all items paid', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 10,
            amount: '100.00',
            total_amount: '100.00',
            user_id: 1
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'paid' }] // All items are paid
        })
        .mockResolvedValueOnce() // Update reimbursement status
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // COMMIT

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reimbursements'),
        expect.any(Array)
      );
    });

    test('should not update reimbursement status when items remain unpaid', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 10,
            amount: '100.00',
            total_amount: '100.00',
            user_id: 1
          }]
        })
        .mockResolvedValueOnce({
          rows: [
            { status: 'paid' },
            { status: 'approved_by_finance' } // One item still unpaid
          ]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // COMMIT

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should not update reimbursement status
      const updateCalls = mockClient.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('UPDATE reimbursements')
      );
      expect(updateCalls.length).toBe(0);
    });

    test('should handle database errors', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should release client connection in finally block', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 10,
            amount: '100.00',
            total_amount: '100.00',
            user_id: 1
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'paid' }]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // COMMIT

      await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(200);

      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should release client connection even on error', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(500);

      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle null paidAmount', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 10,
            amount: '100.00',
            total_amount: '100.00',
            user_id: 1
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'paid' }]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // COMMIT

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: null,
          tdsAmount: 10,
          finalAmount: 90
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle null tdsAmount', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 10,
            amount: '100.00',
            total_amount: '100.00',
            user_id: 1
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'paid' }]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // COMMIT

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: null,
          finalAmount: 100
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle null finalAmount', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            reimbursement_id: 10,
            amount: '100.00',
            total_amount: '100.00',
            user_id: 1
          }]
        })
        .mockResolvedValueOnce({
          rows: [{ status: 'paid' }]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // COMMIT

      const response = await request(app)
        .post('/api/approvals/finance/mark-paid')
        .send({
          itemId: 1,
          paidAmount: 100,
          tdsAmount: 10,
          finalAmount: null
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Superadmin endpoints', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });
    });

    test('GET /superadmin/manager/:status should call handler', async () => {
      const response = await request(app)
        .get('/api/approvals/superadmin/manager/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /superadmin/hr/:status should call handler', async () => {
      const response = await request(app)
        .get('/api/approvals/superadmin/hr/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /superadmin/finance/:status should call handler', async () => {
      const response = await request(app)
        .get('/api/approvals/superadmin/finance/pending')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
