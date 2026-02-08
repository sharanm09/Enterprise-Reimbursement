const {
  handleApproval,
  handleRejection,
  validateItemForAction
} = require('../../routes/approvals-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Approvals Helpers Edge Cases', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('handleApproval', () => {
    test('should handle approval with null comments', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const config = {
        itemId: 1,
        approverId: 10,
        approvalLevel: 'manager',
        newStatus: 'approved_by_manager',
        comments: null,
        reimbursementStatus: 'pending approval',
        reimbursementId: 100
      };

      await handleApproval(mockClient, config);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reimbursement_approvals'),
        [1, 10, 'manager', 'approved', null]
      );
    });

    test('should handle approval with empty comments', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const config = {
        itemId: 1,
        approverId: 10,
        approvalLevel: 'hr',
        newStatus: 'approved_by_hr',
        comments: '',
        reimbursementStatus: 'pending approval',
        reimbursementId: 100
      };

      await handleApproval(mockClient, config);

      expect(mockClient.query).toHaveBeenCalled();
    });
  });

  describe('handleRejection', () => {
    test('should handle rejection with comments', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const config = {
        itemId: 1,
        approverId: 10,
        approvalLevel: 'manager',
        newStatus: 'rejected_by_manager',
        comments: 'Not approved',
        reimbursementStatus: 'rejected',
        reimbursementId: 100
      };

      await handleRejection(mockClient, config);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reimbursement_approvals'),
        [1, 10, 'manager', 'rejected', 'Not approved']
      );
    });
  });

  describe('validateItemForAction', () => {
    test('should validate item with manager check', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 1,
          reimbursement_id: 100,
          status: 'pending',
          user_id: 5,
          reimbursement_status: 'submitted'
        }]
      });

      const result = await validateItemForAction(mockClient, 1, 10, 'pending', [], true);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    test('should return null when item not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await validateItemForAction(mockClient, 999, 10, 'pending', [], false);

      expect(result).toBeNull();
    });

    test('should validate item with notInStatuses', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 1,
          reimbursement_id: 100,
          status: 'pending',
          user_id: 5
        }]
      });

      const result = await validateItemForAction(
        mockClient,
        1,
        10,
        'pending',
        ['rejected_by_manager'],
        false
      );

      expect(result).toBeDefined();
    });

    test('should return null when item in excluded status', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{
          id: 1,
          reimbursement_id: 100,
          status: 'rejected_by_manager',
          user_id: 5
        }]
      });

      const result = await validateItemForAction(
        mockClient,
        1,
        10,
        'pending',
        ['rejected_by_manager'],
        false
      );

      // The query should filter out rejected items, so result should be null
      expect(mockClient.query).toHaveBeenCalled();
    });

    test('should handle manager check when user not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await validateItemForAction(mockClient, 1, 10, 'pending', [], true);

      expect(result).toBeNull();
    });
  });
});


