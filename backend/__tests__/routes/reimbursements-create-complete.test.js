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

describe('Reimbursements Create Complete Coverage', () => {
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

  describe('POST / - Create Reimbursement Edge Cases', () => {
    test('should handle multiple items with files', async () => {
      parseRequestData.mockReturnValue({
        department_id: 1,
        cost_center_id: 1,
        project_id: 1,
        description: 'Test',
        items: [
          {
            expense_category_id: 1,
            expense_type: 'Food',
            amount: 100,
            expense_date: '2024-01-01'
          },
          {
            expense_category_id: 2,
            expense_type: 'Travel',
            amount: 200,
            expense_date: '2024-01-02'
          }
        ],
        status: 'draft'
      });
      validateItems.mockReturnValue({ valid: true });
      calculateTotalAmount.mockReturnValue({ valid: true, totalAmount: 300 });
      determineReimbursementStatus.mockReturnValue('draft');
      organizeItemFiles.mockReturnValue({
        0: [{ originalname: 'receipt1.jpg', path: '/uploads/receipt1.jpg', size: 1024, mimetype: 'image/jpeg' }],
        1: [{ originalname: 'receipt2.jpg', path: '/uploads/receipt2.jpg', size: 2048, mimetype: 'image/jpeg' }]
      });
      processAllItems.mockResolvedValue({ success: true });
      recalculateAndUpdateTotal.mockResolvedValue(300);

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        }) // INSERT reimbursement
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce({
          rows: [{ total: '300' }]
        }); // Recalculate total

      fetchReimbursementWithDetails.mockResolvedValue({
        reimbursement: { id: 1, total_amount: 300 },
        items: [
          { id: 1, amount: 100 },
          { id: 2, amount: 200 }
        ],
        attachments: [
          { id: 1, file_name: 'receipt1.jpg' },
          { id: 2, file_name: 'receipt2.jpg' }
        ]
      });

      app.use((req, res, next) => {
        req.files = [
          { fieldname: 'item_0_attachments', originalname: 'receipt1.jpg', path: '/uploads/receipt1.jpg', size: 1024, mimetype: 'image/jpeg' },
          { fieldname: 'item_1_attachments', originalname: 'receipt2.jpg', path: '/uploads/receipt2.jpg', size: 2048, mimetype: 'image/jpeg' }
        ];
        next();
      });

      const response = await request(app)
        .post('/api/reimbursements')
        .send({
          department_id: 1,
          items: [
            { expense_type: 'Food', amount: 100, expense_date: '2024-01-01' },
            { expense_type: 'Travel', amount: 200, expense_date: '2024-01-02' }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(processAllItems).toHaveBeenCalled();
    });

    test('should handle processAllItems returning error', async () => {
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

    test('should handle recalculateAndUpdateTotal errors', async () => {
      parseRequestData.mockReturnValue({
        items: [{ amount: 100 }]
      });
      validateItems.mockReturnValue({ valid: true });
      calculateTotalAmount.mockReturnValue({ valid: true, totalAmount: 100 });
      determineReimbursementStatus.mockReturnValue('draft');
      organizeItemFiles.mockReturnValue({});
      processAllItems.mockResolvedValue({ success: true });
      recalculateAndUpdateTotal.mockRejectedValue(new Error('Recalculation failed'));

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce(); // COMMIT

      fetchReimbursementWithDetails.mockResolvedValue({
        reimbursement: { id: 1 },
        items: [],
        attachments: []
      });

      const response = await request(app)
        .post('/api/reimbursements')
        .send({ items: [{ amount: 100 }] })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle fetchReimbursementWithDetails errors', async () => {
      parseRequestData.mockReturnValue({
        items: [{ amount: 100 }]
      });
      validateItems.mockReturnValue({ valid: true });
      calculateTotalAmount.mockReturnValue({ valid: true, totalAmount: 100 });
      determineReimbursementStatus.mockReturnValue('draft');
      organizeItemFiles.mockReturnValue({});
      processAllItems.mockResolvedValue({ success: true });
      recalculateAndUpdateTotal.mockResolvedValue(100);
      fetchReimbursementWithDetails.mockRejectedValue(new Error('Fetch failed'));

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce({
          rows: [{ total: '100' }]
        });

      const response = await request(app)
        .post('/api/reimbursements')
        .send({ items: [{ amount: 100 }] })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle transaction rollback on error', async () => {
      parseRequestData.mockReturnValue({
        items: [{ amount: 100 }]
      });
      validateItems.mockReturnValue({ valid: true });
      calculateTotalAmount.mockReturnValue({ valid: true, totalAmount: 100 });
      determineReimbursementStatus.mockReturnValue('draft');
      organizeItemFiles.mockReturnValue({});

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')); // INSERT fails

      const response = await request(app)
        .post('/api/reimbursements')
        .send({ items: [{ amount: 100 }] })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should handle client connection errors', async () => {
      pool.connect.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .post('/api/reimbursements')
        .send({ items: [{ amount: 100 }] })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET / - List Reimbursements Edge Cases', () => {
    test('should handle superadmin role', async () => {
      app.use((req, res, next) => {
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

    test('should handle HR role', async () => {
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
    });

    test('should handle employee role', async () => {
      app.use((req, res, next) => {
        req.user = { id: 1, role: { name: 'employee' } };
        next();
      });

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
    });

    test('should handle item query errors gracefully', async () => {
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

    test('should handle table not found error', async () => {
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
});


