const {
  organizeItemFiles,
  processReimbursementItem,
  fetchReimbursementWithDetails
} = require('../../routes/reimbursements-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Reimbursements Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('organizeItemFiles', () => {
    test('should organize files by item index', () => {
      const files = [
        { fieldname: 'item_0_attachments', originalname: 'file1.pdf' },
        { fieldname: 'item_1_attachments', originalname: 'file2.pdf' },
        { fieldname: 'item_0_attachments', originalname: 'file3.pdf' }
      ];

      const result = organizeItemFiles(files);

      expect(result[0]).toHaveLength(2);
      expect(result[1]).toHaveLength(1);
    });

    test('should handle empty files array', () => {
      const result = organizeItemFiles([]);
      expect(result).toEqual({});
    });
  });

  describe('processReimbursementItem', () => {
    test('should process reimbursement item with attachments', async () => {
      const mockClient = {
        query: jest.fn()
      };
      const item = {
        expense_type: 'travel',
        amount: 100,
        description: 'Test expense',
        expense_date: '2024-01-01'
      };
      const itemFilesMap = {
        0: [{ originalname: 'test.pdf', path: '/uploads/test.pdf', size: 1024, mimetype: 'application/pdf' }]
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await processReimbursementItem(mockClient, 100, item, 0, itemFilesMap, 1);

      expect(mockClient.query).toHaveBeenCalled();
    });

    test('should process item without attachments', async () => {
      const mockClient = {
        query: jest.fn()
      };
      const item = {
        expense_type: 'meals',
        amount: 50,
        description: 'Lunch',
        expense_date: '2024-01-01'
      };

      mockClient.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await processReimbursementItem(mockClient, 100, item, 0, {}, 1);

      expect(mockClient.query).toHaveBeenCalled();
    });

    test('should return error when required fields are missing', async () => {
      const mockClient = {
        query: jest.fn()
      };
      const item = {
        amount: 50
        // Missing expense_type and expense_date
      };

      const result = await processReimbursementItem(mockClient, 100, item, 0, {}, 1);

      expect(result.error).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should return error when amount is invalid', async () => {
      const mockClient = {
        query: jest.fn()
      };
      const item = {
        expense_type: 'meals',
        amount: -50,
        expense_date: '2024-01-01'
      };

      const result = await processReimbursementItem(mockClient, 100, item, 0, {}, 1);

      expect(result.error).toBeDefined();
    });
  });

  describe('fetchReimbursementWithDetails', () => {
    test('should fetch reimbursement with all details', async () => {
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

      const result = await fetchReimbursementWithDetails(pool, 1);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.reimbursement).toBeDefined();
    });

    test('should handle reimbursement not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await fetchReimbursementWithDetails(pool, 999);

      expect(result.reimbursement).toBeNull();
      expect(result.items).toEqual([]);
    });

    test('should handle attachment query errors gracefully', async () => {
      pool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, user_id: 1, total_amount: 1000 }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce({ code: '42P01' }); // Table doesn't exist

      const result = await fetchReimbursementWithDetails(pool, 1);

      expect(result).toBeDefined();
      expect(result.attachments).toEqual([]);
    });
  });
});

