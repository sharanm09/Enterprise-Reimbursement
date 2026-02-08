const request = require('supertest');
const express = require('express');
const reimbursementsRouter = require('../../routes/reimbursements');
const { pool } = require('../../config/database');
const upload = require('../../middleware/upload');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

jest.mock('../../middleware/upload', () => ({
  any: jest.fn(() => (req, res, next) => next())
}));

jest.mock('../../routes/reimbursements-helpers', () => ({
  organizeItemFiles: jest.fn(),
  processReimbursementItem: jest.fn(),
  fetchReimbursementWithDetails: jest.fn()
}));

jest.mock('../../routes/reimbursements-get-helpers', () => ({
  handleSimpleGetRequest: jest.fn()
}));

jest.mock('../../routes/reimbursements-validation-helpers', () => ({
  parseRequestData: jest.fn(),
  validateItems: jest.fn(),
  calculateTotalAmount: jest.fn(),
  determineReimbursementStatus: jest.fn()
}));

describe('Reimbursements Routes', () => {
  let app;
  let mockClient;
  const { handleSimpleGetRequest } = require('../../routes/reimbursements-get-helpers');
  const {
    parseRequestData,
    validateItems,
    calculateTotalAmount,
    determineReimbursementStatus
  } = require('../../routes/reimbursements-validation-helpers');
  const {
    organizeItemFiles,
    processReimbursementItem,
    fetchReimbursementWithDetails
  } = require('../../routes/reimbursements-helpers');

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1 };
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

  describe('GET /api/reimbursements/departments', () => {
    test('should return departments', async () => {
      handleSimpleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/reimbursements/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 401 when not authenticated', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(false);
        next();
      });

      const response = await request(app)
        .get('/api/reimbursements/departments')
        .expect(401);
    });
  });

  describe('GET /api/reimbursements/cost-centers', () => {
    test('should return cost centers', async () => {
      handleSimpleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/reimbursements/cost-centers')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should filter cost centers by department_id', async () => {
      handleSimpleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/reimbursements/cost-centers?department_id=1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reimbursements/projects', () => {
    test('should return projects', async () => {
      handleSimpleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/reimbursements/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reimbursements/expense-categories', () => {
    test('should return expense categories', async () => {
      handleSimpleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/reimbursements/expense-categories')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/reimbursements', () => {
    test('should return reimbursements for employee', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 1,
            total_amount: 1000,
            status: 'submitted'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            amount: 1000,
            expense_type: 'Food'
          }]
        });

      const response = await request(app)
        .get('/api/reimbursements')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should return reimbursements for superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 2,
            total_amount: 1000,
            status: 'submitted'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            amount: 1000,
            expense_type: 'Food'
          }]
        });

      const response = await request(app)
        .get('/api/reimbursements')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle database errors gracefully', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/reimbursements')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    test('should handle missing table errors', async () => {
      const error = new Error('Table does not exist');
      error.code = '42P01';
      pool.query.mockRejectedValueOnce(error);

      const response = await request(app)
        .get('/api/reimbursements')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('POST /api/reimbursements', () => {
    test('should create reimbursement successfully', async () => {
      parseRequestData.mockReturnValue({
        department_id: 1,
        cost_center_id: 1,
        project_id: 1,
        description: 'Test',
        items: [{
          expense_category_id: 1,
          expense_type: 'Food',
          amount: 100,
          expense_date: '2024-01-01'
        }],
        status: 'draft'
      });
      validateItems.mockReturnValue({ valid: true });
      calculateTotalAmount.mockReturnValue({ valid: true, totalAmount: 100 });
      determineReimbursementStatus.mockReturnValue('draft');
      organizeItemFiles.mockReturnValue({});
      processReimbursementItem.mockResolvedValue(1);

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        }) // INSERT reimbursement
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce({
          rows: [{ total: '100' }]
        }); // Recalculate total

      fetchReimbursementWithDetails.mockResolvedValue({
        reimbursement: { id: 1 },
        items: [],
        attachments: []
      });

      const response = await request(app)
        .post('/api/reimbursements')
        .send({
          department_id: 1,
          items: [{
            expense_type: 'Food',
            amount: 100,
            expense_date: '2024-01-01'
          }]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 400 when items validation fails', async () => {
      parseRequestData.mockReturnValue({
        items: []
      });
      validateItems.mockReturnValue({ valid: false, error: 'At least one item required' });

      mockClient.query.mockResolvedValueOnce(); // BEGIN

      const response = await request(app)
        .post('/api/reimbursements')
        .send({ items: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when amount calculation fails', async () => {
      parseRequestData.mockReturnValue({
        items: [{ amount: 100 }]
      });
      validateItems.mockReturnValue({ valid: true });
      calculateTotalAmount.mockReturnValue({ valid: false, error: 'Invalid amount' });

      mockClient.query.mockResolvedValueOnce(); // BEGIN

      const response = await request(app)
        .post('/api/reimbursements')
        .send({ items: [{ amount: -100 }] })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle errors and rollback', async () => {
      parseRequestData.mockReturnValue({
        items: [{ amount: 100 }]
      });
      validateItems.mockReturnValue({ valid: true });
      calculateTotalAmount.mockReturnValue({ valid: true, totalAmount: 100 });
      determineReimbursementStatus.mockReturnValue('draft');

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(new Error('Database error')); // INSERT fails

      const response = await request(app)
        .post('/api/reimbursements')
        .send({ items: [{ amount: 100 }] })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});


