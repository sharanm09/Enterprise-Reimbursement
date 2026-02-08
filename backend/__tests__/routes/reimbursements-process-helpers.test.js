const {
  processAllItems,
  recalculateAndUpdateTotal
} = require('../../routes/reimbursements-process-helpers');

describe('Reimbursements Process Helpers', () => {
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
    test('should process all items successfully', async () => {
      const items = [
        { amount: 100 },
        { amount: 200 }
      ];
      const itemFilesMap = {};

      mockProcessReimbursementItem
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
      expect(mockProcessReimbursementItem).toHaveBeenCalledTimes(2);
    });

    test('should return error when item processing fails', async () => {
      const items = [
        { amount: 100 }
      ];
      const itemFilesMap = {};

      mockProcessReimbursementItem.mockResolvedValueOnce({
        error: 'Invalid item data'
      });

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
      expect(result.error).toBe('Invalid item data');
    });
  });

  describe('recalculateAndUpdateTotal', () => {
    test('should update total when recalculated differs', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: '150.00' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 100);

      expect(result).toBe(150);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE reimbursements'),
        [150, 1]
      );
    });

    test('should not update when totals match', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ total: '100.00' }]
      });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 100);

      expect(result).toBe(100);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('should handle small differences within tolerance', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ total: '100.005' }]
      });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 100);

      expect(result).toBe(100.005);
      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('should handle null total', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ total: null }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await recalculateAndUpdateTotal(mockClient, 1, 100);

      expect(result).toBe(0);
    });
  });
});
