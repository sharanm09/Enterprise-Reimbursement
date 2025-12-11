const {
  organizeItemFiles,
  processReimbursementItem,
  fetchReimbursementWithDetails
} = require('../../routes/reimbursements-helpers');
const { pool } = require('../../config/database');
const logger = require('../../utils/logger');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => ({
  warn: jest.fn()
}));

describe('Reimbursements Helpers Extended', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('organizeItemFiles', () => {
    test('should organize files by item index', () => {
      const files = [
        { fieldname: 'item_0_attachments', originalname: 'file1.jpg' },
        { fieldname: 'item_0_attachments', originalname: 'file2.jpg' },
        { fieldname: 'item_1_attachments', originalname: 'file3.jpg' }
      ];

      const result = organizeItemFiles(files);

      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(1);
    });

    test('should return empty object for no files', () => {
      const result = organizeItemFiles([]);

      expect(result).toEqual({});
    });

    test('should ignore files with invalid fieldnames', () => {
      const files = [
        { fieldname: 'item_0_attachments', originalname: 'file1.jpg' },
        { fieldname: 'invalid_field', originalname: 'file2.jpg' }
      ];

      const result = organizeItemFiles(files);

      expect(result[0]).toHaveLength(1);
      expect(result[1]).toBeUndefined();
    });

    test('should handle null/undefined files', () => {
      expect(organizeItemFiles(null)).toEqual({});
      expect(organizeItemFiles(undefined)).toEqual({});
    });
  });

  describe('processReimbursementItem', () => {
    test('should process item successfully', async () => {
      const item = {
        expense_category_id: 1,
        expense_type: 'Food',
        amount: 100,
        expense_date: '2024-01-01',
        description: 'Lunch'
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 10 }]
        });

      const result = await processReimbursementItem(mockClient, 1, item, 0, {}, 1);

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reimbursement_items'),
        expect.any(Array)
      );
    });

    test('should return error when required fields missing', async () => {
      const item = {
        amount: 100
        // Missing expense_type and expense_date
      };

      mockClient.query.mockResolvedValueOnce();

      const result = await processReimbursementItem(mockClient, 1, item, 0, {}, 1);

      expect(result.error).toContain('required');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should return error for invalid amount', async () => {
      const item = {
        expense_type: 'Food',
        amount: -100,
        expense_date: '2024-01-01'
      };

      mockClient.query.mockResolvedValueOnce();

      const result = await processReimbursementItem(mockClient, 1, item, 0, {}, 1);

      expect(result.error).toContain('Invalid amount');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should save attachments for item', async () => {
      const item = {
        expense_type: 'Food',
        amount: 100,
        expense_date: '2024-01-01'
      };
      const itemFilesMap = {
        0: [
          { originalname: 'receipt.jpg', path: '/uploads/receipt.jpg', size: 1024, mimetype: 'image/jpeg' }
        ]
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 10 }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await processReimbursementItem(mockClient, 1, item, 0, itemFilesMap, 1);

      expect(result.success).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reimbursement_attachments'),
        expect.any(Array)
      );
    });

    test('should handle attachment save errors gracefully', async () => {
      const item = {
        expense_type: 'Food',
        amount: 100,
        expense_date: '2024-01-01'
      };
      const itemFilesMap = {
        0: [
          { originalname: 'receipt.jpg', path: '/uploads/receipt.jpg', size: 1024, mimetype: 'image/jpeg' }
        ]
      };

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 10 }]
        })
        .mockRejectedValueOnce(new Error('Attachment error'));

      const result = await processReimbursementItem(mockClient, 1, item, 0, itemFilesMap, 1);

      expect(result.success).toBe(true);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should ignore table not found errors for attachments', async () => {
      const item = {
        expense_type: 'Food',
        amount: 100,
        expense_date: '2024-01-01'
      };
      const itemFilesMap = {
        0: [
          { originalname: 'receipt.jpg', path: '/uploads/receipt.jpg', size: 1024, mimetype: 'image/jpeg' }
        ]
      };

      const error = new Error('Table does not exist');
      error.code = '42P01';

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 10 }]
        })
        .mockRejectedValueOnce(error);

      const result = await processReimbursementItem(mockClient, 1, item, 0, itemFilesMap, 1);

      expect(result.success).toBe(true);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('fetchReimbursementWithDetails', () => {
    test('should fetch reimbursement with all details', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            department_name: 'IT',
            cost_center_name: 'Development',
            project_name: 'Project A'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            expense_category_name: 'Food',
            amount: 100
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            file_name: 'receipt.jpg'
          }]
        });

      const result = await fetchReimbursementWithDetails(pool, 1);

      expect(result.reimbursement).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.attachments).toHaveLength(1);
    });

    test('should handle missing reimbursement', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await fetchReimbursementWithDetails(pool, 999);

      expect(result.reimbursement).toBeNull();
      expect(result.items).toEqual([]);
    });

    test('should handle attachment query errors', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockRejectedValueOnce(new Error('Attachment query error'));

      const result = await fetchReimbursementWithDetails(pool, 1);

      expect(result.reimbursement).toBeDefined();
      expect(result.attachments).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should ignore table not found errors for attachments', async () => {
      const error = new Error('Table does not exist');
      error.code = '42P01';

      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockRejectedValueOnce(error);

      const result = await fetchReimbursementWithDetails(pool, 1);

      expect(result.reimbursement).toBeDefined();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    test('should handle join query errors gracefully', async () => {
      pool.query
        .mockRejectedValueOnce(new Error('Join error'));

      const result = await fetchReimbursementWithDetails(pool, 1);

      expect(result.reimbursement).toBeNull();
      expect(result.items).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});


