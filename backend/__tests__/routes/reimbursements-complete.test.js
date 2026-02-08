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

jest.mock('../../routes/reimbursements-process-helpers', () => ({
  processAllItems: jest.fn(),
  recalculateAndUpdateTotal: jest.fn()
}));

describe('Reimbursements Routes Complete Coverage', () => {
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
    processReimbursementItem
  } = require('../../routes/reimbursements-helpers');
  const {
    processAllItems,
    recalculateAndUpdateTotal
  } = require('../../routes/reimbursements-process-helpers');
  const { fetchReimbursementWithDetails } = require('../../routes/reimbursements-helpers');

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

  describe('POST / - Create Reimbursement', () => {
    test('should create reimbursement with files', async () => {
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
      organizeItemFiles.mockReturnValue({ 0: [{ originalname: 'receipt.jpg', path: '/uploads/receipt.jpg', size: 1024, mimetype: 'image/jpeg' }] });
      processAllItems.mockResolvedValue({ success: true });
      recalculateAndUpdateTotal.mockResolvedValue(100);

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
        reimbursement: { id: 1, total_amount: 100 },
        items: [{ id: 1, amount: 100 }],
        attachments: [{ id: 1, file_name: 'receipt.jpg' }]
      });

      app.use((req, res, next) => {
        req.files = [
          { fieldname: 'item_0_attachments', originalname: 'receipt.jpg', path: '/uploads/receipt.jpg', size: 1024, mimetype: 'image/jpeg' }
        ];
        next();
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
      expect(processAllItems).toHaveBeenCalled();
    });

    test('should handle item processing errors', async () => {
      parseRequestData.mockReturnValue({
        items: [{ amount: 100 }]
      });
      validateItems.mockReturnValue({ valid: true });
      calculateTotalAmount.mockReturnValue({ valid: true, totalAmount: 100 });
      determineReimbursementStatus.mockReturnValue('draft');
      organizeItemFiles.mockReturnValue({});
      processAllItems.mockResolvedValue({ success: false, error: 'Item processing failed' });

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        });

      const response = await request(app)
        .post('/api/reimbursements')
        .send({ items: [{ amount: 100 }] })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should handle total recalculation difference', async () => {
      parseRequestData.mockReturnValue({
        items: [{ amount: 100 }]
      });
      validateItems.mockReturnValue({ valid: true });
      calculateTotalAmount.mockReturnValue({ valid: true, totalAmount: 100 });
      determineReimbursementStatus.mockReturnValue('draft');
      organizeItemFiles.mockReturnValue({});
      processAllItems.mockResolvedValue({ success: true });
      recalculateAndUpdateTotal.mockResolvedValue(150); // Different from initial

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce({
          rows: [{ total: '150' }]
        })
        .mockResolvedValueOnce(); // UPDATE total

      fetchReimbursementWithDetails.mockResolvedValue({
        reimbursement: { id: 1 },
        items: [],
        attachments: []
      });

      const response = await request(app)
        .post('/api/reimbursements')
        .send({ items: [{ amount: 100 }] })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle submitted status', async () => {
      parseRequestData.mockReturnValue({
        items: [{ amount: 100 }],
        status: 'submitted'
      });
      validateItems.mockReturnValue({ valid: true });
      calculateTotalAmount.mockReturnValue({ valid: true, totalAmount: 100 });
      determineReimbursementStatus.mockReturnValue('pending approval');
      organizeItemFiles.mockReturnValue({});
      processAllItems.mockResolvedValue({ success: true });
      recalculateAndUpdateTotal.mockResolvedValue(100);

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce({
          rows: [{ total: '100' }]
        });

      fetchReimbursementWithDetails.mockResolvedValue({
        reimbursement: { id: 1 },
        items: [],
        attachments: []
      });

      const response = await request(app)
        .post('/api/reimbursements')
        .send({
          items: [{ amount: 100 }],
          status: 'submitted'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET / - List Reimbursements', () => {
    test('should return reimbursements for HR role', async () => {
      app.use((req, res, next) => {
        req.user = { id: 1, role: { name: 'hr' } };
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
      expect(response.body.data).toBeDefined();
    });

    test('should handle item fetch errors gracefully', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 1,
            total_amount: 1000,
            status: 'submitted'
          }]
        })
        .mockRejectedValueOnce(new Error('Item query error'));

      const response = await request(app)
        .get('/api/reimbursements')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].items).toEqual([]);
    });
  });
});


