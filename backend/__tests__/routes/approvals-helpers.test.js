const { validateItemForAction } = require('../../routes/approvals-helpers');

describe('Approvals Helpers', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn()
    };
  });

  describe('validateItemForAction', () => {
    test('should validate item without manager check', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 1,
          reimbursement_id: 100,
          user_id: 10,
          reimbursement_status: 'pending approval'
        }]
      });

      const result = await validateItemForAction(mockClient, 1, 5, 'pending', [], false);

      expect(result).toBeTruthy();
      expect(result.id).toBe(1);
      expect(mockClient.query).toHaveBeenCalled();
    });

    test('should validate item with manager check', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 1,
          reimbursement_id: 100,
          user_id: 10,
          reimbursement_status: 'pending approval'
        }]
      });

      const result = await validateItemForAction(mockClient, 1, 5, 'pending', [], true);

      expect(result).toBeTruthy();
      expect(mockClient.query).toHaveBeenCalled();
    });

    test('should return null when item not found', async () => {
      mockClient.query.mockResolvedValue({
        rows: []
      });

      const result = await validateItemForAction(mockClient, 999, 5, 'pending', [], false);

      expect(result).toBeNull();
    });

    test('should handle notInStatuses parameter', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 1,
          reimbursement_id: 100,
          user_id: 10,
          reimbursement_status: 'pending approval'
        }]
      });

      const result = await validateItemForAction(
        mockClient,
        1,
        5,
        'pending',
        ['rejected', 'cancelled'],
        false
      );

      expect(result).toBeTruthy();
    });
  });
});


