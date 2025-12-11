const { processFinanceApproval } = require('../../routes/approvals-finance-helpers');

describe('Approvals Finance Helpers', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn()
    };
  });

  test('should process finance approval and update reimbursement status to fully_approved', async () => {
    mockClient.query
      .mockResolvedValueOnce() // UPDATE reimbursement_items
      .mockResolvedValueOnce() // INSERT reimbursement_approvals
      .mockResolvedValueOnce({ rows: [{ status: 'approved_by_finance' }] }) // SELECT all items
      .mockResolvedValueOnce(); // UPDATE reimbursements (second time - fully_approved)

    await processFinanceApproval(mockClient, 1, 5, 'Approved', 100);

    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  test('should process finance approval and update reimbursement status to partially_approved', async () => {
    mockClient.query
      .mockResolvedValueOnce() // UPDATE reimbursement_items
      .mockResolvedValueOnce() // INSERT reimbursement_approvals
      .mockResolvedValueOnce({ rows: [{ status: 'approved_by_finance' }, { status: 'pending' }] }) // SELECT all items
      .mockResolvedValueOnce(); // UPDATE reimbursements (second time - partially_approved)

    await processFinanceApproval(mockClient, 1, 5, 'Approved', 100);

    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  test('should handle rejected items in reimbursement', async () => {
    mockClient.query
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ rows: [{ status: 'approved_by_finance' }, { status: 'rejected_by_finance' }] })
      .mockResolvedValueOnce();

    await processFinanceApproval(mockClient, 1, 5, 'Approved', 100);

    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });
});

