const { processFinanceApproval } = require('../../routes/approvals-finance-helpers');

describe('Approvals Finance Helpers Edge Cases', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('processFinanceApproval', () => {
    test('should set reimbursement to fully_approved when all items paid', async () => {
      mockClient.query
        .mockResolvedValueOnce() // UPDATE item
        .mockResolvedValueOnce() // INSERT approval
        .mockResolvedValueOnce({
          rows: [
            { status: 'paid' },
            { status: 'paid' }
          ]
        }) // Check all items
        .mockResolvedValueOnce(); // UPDATE reimbursement

      await processFinanceApproval(mockClient, 1, 10, 'Approved', 100);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE reimbursements SET status = 'fully_approved'"),
        ['fully_approved', 100]
      );
    });

    test('should set reimbursement to partially_approved when some items pending', async () => {
      mockClient.query
        .mockResolvedValueOnce() // UPDATE item
        .mockResolvedValueOnce() // INSERT approval
        .mockResolvedValueOnce({
          rows: [
            { status: 'approved_by_finance' },
            { status: 'pending' }
          ]
        }) // Check all items
        .mockResolvedValueOnce(); // UPDATE reimbursement

      await processFinanceApproval(mockClient, 1, 10, 'Approved', 100);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE reimbursements SET status = 'partially_approved'"),
        ['partially_approved', 100]
      );
    });

    test('should set reimbursement to partially_approved when some items rejected', async () => {
      mockClient.query
        .mockResolvedValueOnce() // UPDATE item
        .mockResolvedValueOnce() // INSERT approval
        .mockResolvedValueOnce({
          rows: [
            { status: 'approved_by_finance' },
            { status: 'rejected_by_manager' }
          ]
        }) // Check all items
        .mockResolvedValueOnce(); // UPDATE reimbursement

      await processFinanceApproval(mockClient, 1, 10, 'Approved', 100);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE reimbursements SET status = 'partially_approved'"),
        ['partially_approved', 100]
      );
    });

    test('should set reimbursement to partially_approved when has rejected items', async () => {
      mockClient.query
        .mockResolvedValueOnce() // UPDATE item
        .mockResolvedValueOnce() // INSERT approval
        .mockResolvedValueOnce({
          rows: [
            { status: 'paid' },
            { status: 'rejected_by_finance' }
          ]
        }) // Check all items
        .mockResolvedValueOnce(); // UPDATE reimbursement

      await processFinanceApproval(mockClient, 1, 10, 'Approved', 100);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE reimbursements SET status = 'partially_approved'"),
        ['partially_approved', 100]
      );
    });

    test('should handle null comments', async () => {
      mockClient.query
        .mockResolvedValueOnce() // UPDATE item
        .mockResolvedValueOnce() // INSERT approval
        .mockResolvedValueOnce({
          rows: [{ status: 'paid' }]
        }) // Check all items
        .mockResolvedValueOnce(); // UPDATE reimbursement

      await processFinanceApproval(mockClient, 1, 10, null, 100);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reimbursement_approvals'),
        [1, 10, 'finance', 'approved', null]
      );
    });

    test('should handle empty comments', async () => {
      mockClient.query
        .mockResolvedValueOnce() // UPDATE item
        .mockResolvedValueOnce() // INSERT approval
        .mockResolvedValueOnce({
          rows: [{ status: 'paid' }]
        }) // Check all items
        .mockResolvedValueOnce(); // UPDATE reimbursement

      await processFinanceApproval(mockClient, 1, 10, '', 100);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reimbursement_approvals'),
        [1, 10, 'finance', 'approved', '']
      );
    });

    test('should handle single item reimbursement', async () => {
      mockClient.query
        .mockResolvedValueOnce() // UPDATE item
        .mockResolvedValueOnce() // INSERT approval
        .mockResolvedValueOnce({
          rows: [{ status: 'approved_by_finance' }]
        }) // Check all items
        .mockResolvedValueOnce(); // UPDATE reimbursement

      await processFinanceApproval(mockClient, 1, 10, 'Approved', 100);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE reimbursements SET status = 'partially_approved'"),
        ['partially_approved', 100]
      );
    });
  });
});


