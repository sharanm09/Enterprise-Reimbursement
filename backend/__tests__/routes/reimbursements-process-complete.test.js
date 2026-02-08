const {
  processAllItems,
  recalculateAndUpdateTotal
} = require('../../routes/reimbursements-process-helpers');

describe('Reimbursements Process Helpers Complete', () => {
  let mockClient;
  let mockProcessReimbursementItem;

  beforeEach(() => {
    mockClient = {
      query: jest.fn()
    };
    mockProcessReimbursementItem = jest.fn();
    jest.clearAllMocks();
  });

  describe('processAllItems', () => {
    test('should process single item successfully', async () => {
      const items = [{ amount: 100 }];
      const itemFilesMap = {};

      mockProcessReimbursementItem.mockResolvedValueOnce({ success: true });

      const result = await processAllItems(
        mockClient,
        1,
        items,
        itemFilesMap,
        1,
        jest.fn(),
        mockProcessReimbursementItem
      );

      expect(result.success).toBe(true);
      expect(mockProcessReimbursementItem).toHaveBeenCalledTimes(1);
    });

    test('should process multiple items successfully', async () => {
      const items = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 }
      ];
      const itemFilesMap = {};

      mockProcessReimbursementItem
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      const result = await processAllItems(
        mockClient,
        1,
        items,
        itemFilesMap,
        1,
        jest.fn(),
        mockProcessReimbursementItem
      );

      expect(result.success).toBe(true);
      expect(mockProcessReimbursementItem).toHaveBeenCalledTimes(3);
    });

    test('should stop processing on first error', async () => {
      const items = [
        { amount: 100 },
        { amount: 200 },
        { amount: 300 }
      ];
      const itemFilesMap = {};

      mockProcessReimbursementItem
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ error: 'Item 2 failed' });

      const result = await processAllItems(
        mockClient,
        1,
        items,
        itemFilesMap,
        1,
        jest.fn(),
        mockProcessReimbursementItem
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Item 2 failed');
      expect(mockProcessReimbursementItem).toHaveBeenCalledTimes(2);
    });

    test('should pass correct parameters to processReimbursementItem', async () => {
      const items = [
        { expense_type: 'Food', amount: 100, expense_date: '2024-01-01' }
      ];
      const itemFilesMap = { 0: [{ originalname: 'receipt.jpg' }] };

      mockProcessReimbursementItem.mockResolvedValueOnce({ success: true });

      await processAllItems(
        mockClient,
        100,
        items,
        itemFilesMap,
        1,
        jest.fn(),
        mockProcessReimbursementItem
      );

      expect(mockProcessReimbursementItem).toHaveBeenCalledWith(
        mockClient,
        100,
        items[0],
        0,
        itemFilesMap,
        1
      );
    });
  });

  describe('recalculateAndUpdateTotal', () => {
    test('should update total when difference exceeds threshold', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: '150.50' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 100);

      expect(result).toBe(150.50);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reimbursements'),
        [150.50, 1]
      );
    });

    test('should not update when difference is within threshold', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ total: '100.005' }]
      });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 100);

      expect(result).toBe(100.005);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reimbursements'),
        expect.any(Array)
      );
    });

    test('should handle exact match', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ total: '100.00' }]
      });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 100);

      expect(result).toBe(100);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('should handle null total from database', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: null }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 100);

      expect(result).toBe(0);
    });

    test('should handle zero total', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ total: '0' }]
      });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 0);

      expect(result).toBe(0);
    });

    test('should handle large difference', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: '1000.00' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 100);

      expect(result).toBe(1000);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reimbursements'),
        [1000, 1]
      );
    });

    test('should handle small difference just above threshold', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: '100.02' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 100);

      expect(result).toBe(100.02);
      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });
  });
});


