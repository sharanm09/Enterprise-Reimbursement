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

  test('should handle null comments', async () => {
    mockClient.query
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ rows: [{ status: 'approved_by_finance' }] })
      .mockResolvedValueOnce();

    await processFinanceApproval(mockClient, 1, 5, null, 100);

    expect(mockClient.query).toHaveBeenCalledTimes(4);
    expect(mockClient.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO reimbursement_approvals'),
      expect.arrayContaining([1, 5, 'finance', 'approved', null])
    );
  });

  test('should handle undefined comments', async () => {
    mockClient.query
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ rows: [{ status: 'approved_by_finance' }] })
      .mockResolvedValueOnce();

    await processFinanceApproval(mockClient, 1, 5, undefined, 100);

    expect(mockClient.query).toHaveBeenCalledTimes(4);
  });

  test('should handle items with paid status', async () => {
    mockClient.query
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ rows: [{ status: 'paid' }, { status: 'approved_by_finance' }] })
      .mockResolvedValueOnce();

    await processFinanceApproval(mockClient, 1, 5, 'Approved', 100);

    expect(mockClient.query).toHaveBeenCalledTimes(4);
    expect(mockClient.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('UPDATE reimbursements'),
      expect.arrayContaining(['fully_approved', 100])
    );
  });

  test('should handle mixed statuses with some rejected', async () => {
    mockClient.query
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ 
        rows: [
          { status: 'approved_by_finance' }, 
          { status: 'rejected_by_finance' },
          { status: 'paid' }
        ] 
      })
      .mockResolvedValueOnce();

    await processFinanceApproval(mockClient, 1, 5, 'Approved', 100);

    expect(mockClient.query).toHaveBeenCalledTimes(4);
    expect(mockClient.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('UPDATE reimbursements'),
      expect.arrayContaining(['partially_approved', 100])
    );
  });

  test('should handle items with status containing rejected', async () => {
    mockClient.query
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ rows: [{ status: 'rejected_by_manager' }] })
      .mockResolvedValueOnce();

    await processFinanceApproval(mockClient, 1, 5, 'Approved', 100);

    expect(mockClient.query).toHaveBeenCalledTimes(4);
    expect(mockClient.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('UPDATE reimbursements'),
      expect.arrayContaining(['partially_approved', 100])
    );
  });

  test('should handle empty items array', async () => {
    mockClient.query
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce();

    await processFinanceApproval(mockClient, 1, 5, 'Approved', 100);

    expect(mockClient.query).toHaveBeenCalledTimes(4);
    expect(mockClient.query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('UPDATE reimbursements'),
      expect.arrayContaining(['fully_approved', 100])
    );
  });
});

