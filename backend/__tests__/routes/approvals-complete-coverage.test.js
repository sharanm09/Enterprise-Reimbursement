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
    if (req.user?.role?.name === 'finance') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  }),
  isHR: jest.fn((req, res, next) => {
    if (req.user?.role?.name === 'hr') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  }),
  isManager: jest.fn((req, res, next) => {
    if (req.user?.role?.name === 'manager') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  }),
  isSuperAdmin: jest.fn((req, res, next) => {
    if (req.user?.role?.name === 'superadmin') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  })
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('Approvals Routes Complete Coverage', () => {
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

  describe('Manager Routes', () => {
    describe('GET /manager/pending', () => {
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
      });
    });

    describe('POST /manager/approve', () => {
      test('should approve item successfully', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              reimbursement_id: 100,
              status: 'pending'
            }]
          })
          .mockResolvedValueOnce() // UPDATE item
          .mockResolvedValueOnce() // INSERT approval
          .mockResolvedValueOnce(); // COMMIT

        const response = await request(app)
          .post('/api/approvals/manager/approve')
          .send({ itemId: 1, comments: 'Approved' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should return 400 when itemId missing', async () => {
        const response = await request(app)
          .post('/api/approvals/manager/approve')
          .send({ comments: 'Approved' })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /manager/reject', () => {
      test('should reject item successfully', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              reimbursement_id: 100,
              status: 'pending'
            }]
          })
          .mockResolvedValueOnce() // UPDATE item
          .mockResolvedValueOnce() // INSERT approval
          .mockResolvedValueOnce(); // COMMIT

        const response = await request(app)
          .post('/api/approvals/manager/reject')
          .send({ itemId: 1, comments: 'Rejected' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should return 400 when comments missing', async () => {
        const response = await request(app)
          .post('/api/approvals/manager/reject')
          .send({ itemId: 1 })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /manager/approved', () => {
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
  });

  describe('HR Routes', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.user = { id: 1, role: { name: 'hr' } };
        next();
      });
    });

    describe('GET /hr/pending', () => {
      test('should return pending approvals for HR', async () => {
        pool.query.mockResolvedValue({
          rows: [{
            item_id: 1,
            status: 'approved_by_manager'
          }]
        });

        const response = await request(app)
          .get('/api/approvals/hr/pending')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /hr/approve', () => {
      test('should approve item successfully', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              reimbursement_id: 100,
              status: 'approved_by_manager'
            }]
          })
          .mockResolvedValueOnce() // UPDATE item
          .mockResolvedValueOnce() // INSERT approval
          .mockResolvedValueOnce(); // COMMIT

        const response = await request(app)
          .post('/api/approvals/hr/approve')
          .send({ itemId: 1, comments: 'Approved' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should return 400 when itemId missing', async () => {
        const response = await request(app)
          .post('/api/approvals/hr/approve')
          .send({ comments: 'Approved' })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /hr/reject', () => {
      test('should reject item successfully', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              reimbursement_id: 100,
              status: 'approved_by_manager'
            }]
          })
          .mockResolvedValueOnce() // UPDATE item
          .mockResolvedValueOnce() // INSERT approval
          .mockResolvedValueOnce(); // COMMIT

        const response = await request(app)
          .post('/api/approvals/hr/reject')
          .send({ itemId: 1, comments: 'Rejected' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should return 400 when comments missing', async () => {
        const response = await request(app)
          .post('/api/approvals/hr/reject')
          .send({ itemId: 1 })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /hr/approved', () => {
      test('should return approved items for HR', async () => {
        pool.query.mockResolvedValue({
          rows: [{
            item_id: 1,
            status: 'approved_by_hr'
          }]
        });

        const response = await request(app)
          .get('/api/approvals/hr/approved')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Finance Routes', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.user = { id: 1, role: { name: 'finance' } };
        next();
      });
    });

    describe('GET /finance/pending', () => {
      test('should return pending approvals for Finance', async () => {
        pool.query.mockResolvedValue({
          rows: [{
            item_id: 1,
            status: 'approved_by_hr'
          }]
        });

        const response = await request(app)
          .get('/api/approvals/finance/pending')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /finance/approve', () => {
      test('should approve item successfully', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              reimbursement_id: 100,
              status: 'approved_by_hr'
            }]
          })
          .mockResolvedValueOnce() // UPDATE item
          .mockResolvedValueOnce() // INSERT approval
          .mockResolvedValueOnce(); // COMMIT

        const response = await request(app)
          .post('/api/approvals/finance/approve')
          .send({ itemId: 1, comments: 'Approved' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should return 400 when itemId missing', async () => {
        const response = await request(app)
          .post('/api/approvals/finance/approve')
          .send({ comments: 'Approved' })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /finance/reject', () => {
      test('should reject item successfully', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              reimbursement_id: 100,
              status: 'approved_by_hr'
            }]
          })
          .mockResolvedValueOnce() // UPDATE item
          .mockResolvedValueOnce() // INSERT approval
          .mockResolvedValueOnce(); // COMMIT

        const response = await request(app)
          .post('/api/approvals/finance/reject')
          .send({ itemId: 1, comments: 'Rejected' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should return 400 when comments missing', async () => {
        const response = await request(app)
          .post('/api/approvals/finance/reject')
          .send({ itemId: 1 })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /finance/approved', () => {
      test('should return approved items for Finance', async () => {
        pool.query.mockResolvedValue({
          rows: [{
            item_id: 1,
            status: 'approved_by_finance'
          }]
        });

        const response = await request(app)
          .get('/api/approvals/finance/approved')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /finance/mark-paid', () => {
      test('should mark item as paid successfully', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              reimbursement_id: 100,
              amount: '1000.00',
              total_amount: '1000.00',
              user_id: 1
            }]
          })
          .mockResolvedValueOnce() // UPDATE item
          .mockResolvedValueOnce({
            rows: [{ status: 'paid' }]
          })
          .mockResolvedValueOnce() // UPDATE reimbursement
          .mockResolvedValueOnce(); // COMMIT

        const response = await request(app)
          .post('/api/approvals/finance/mark-paid')
          .send({
            itemId: 1,
            paidAmount: 1000,
            tdsAmount: 100,
            finalAmount: 900
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should return 400 when itemId missing', async () => {
        mockClient.query.mockResolvedValueOnce(); // BEGIN

        const response = await request(app)
          .post('/api/approvals/finance/mark-paid')
          .send({
            paidAmount: 1000,
            tdsAmount: 100,
            finalAmount: 900
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      test('should return 404 when item not found', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({ rows: [] });

        const response = await request(app)
          .post('/api/approvals/finance/mark-paid')
          .send({
            itemId: 999,
            paidAmount: 1000,
            tdsAmount: 100,
            finalAmount: 900
          })
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      test('should return 400 when final amount validation fails', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              reimbursement_id: 100,
              amount: '1000.00',
              total_amount: '1000.00',
              user_id: 1
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
        expect(response.body.message).toContain('Final Amount validation failed');
      });

      test('should handle null paidAmount and use invoice amount', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              reimbursement_id: 100,
              amount: '1000.00',
              total_amount: '1000.00',
              user_id: 1
            }]
          })
          .mockResolvedValueOnce() // UPDATE item
          .mockResolvedValueOnce({
            rows: [{ status: 'paid' }]
          })
          .mockResolvedValueOnce() // UPDATE reimbursement
          .mockResolvedValueOnce(); // COMMIT

        const response = await request(app)
          .post('/api/approvals/finance/mark-paid')
          .send({
            itemId: 1,
            paidAmount: null,
            tdsAmount: 100,
            finalAmount: 900
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
              reimbursement_id: 100,
              amount: '1000.00',
              total_amount: '1000.00',
              user_id: 1
            }]
          })
          .mockResolvedValueOnce() // UPDATE item
          .mockResolvedValueOnce({
            rows: [{ status: 'paid' }]
          })
          .mockResolvedValueOnce() // UPDATE reimbursement
          .mockResolvedValueOnce(); // COMMIT

        const response = await request(app)
          .post('/api/approvals/finance/mark-paid')
          .send({
            itemId: 1,
            paidAmount: 1000,
            tdsAmount: null,
            finalAmount: 1000
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      test('should update reimbursement status when all items paid', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockResolvedValueOnce({
            rows: [{
              id: 1,
              reimbursement_id: 100,
              amount: '1000.00',
              total_amount: '1000.00',
              user_id: 1
            }]
          })
          .mockResolvedValueOnce() // UPDATE item
          .mockResolvedValueOnce({
            rows: [{ status: 'paid' }]
          })
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

      test('should handle database errors', async () => {
        mockClient.query
          .mockResolvedValueOnce() // BEGIN
          .mockRejectedValueOnce(new Error('Database error'));

        const response = await request(app)
          .post('/api/approvals/finance/mark-paid')
          .send({
            itemId: 1,
            paidAmount: 1000,
            tdsAmount: 100,
            finalAmount: 900
          })
          .expect(500);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Superadmin Routes', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });
    });

    describe('GET /superadmin/manager/:status', () => {
      test('should return manager approvals for superadmin', async () => {
        pool.query.mockResolvedValue({
          rows: [{
            item_id: 1,
            status: 'pending'
          }]
        });

        const response = await request(app)
          .get('/api/approvals/superadmin/manager/pending')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /superadmin/hr/:status', () => {
      test('should return HR approvals for superadmin', async () => {
        pool.query.mockResolvedValue({
          rows: [{
            item_id: 1,
            status: 'approved_by_manager'
          }]
        });

        const response = await request(app)
          .get('/api/approvals/superadmin/hr/pending')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /superadmin/finance/:status', () => {
      test('should return Finance approvals for superadmin', async () => {
        pool.query.mockResolvedValue({
          rows: [{
            item_id: 1,
            status: 'approved_by_hr'
          }]
        });

        const response = await request(app)
          .get('/api/approvals/superadmin/finance/pending')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });
});

