const { handleApprovalTransaction, handleRejectionTransaction } = require('../../routes/approvals-transaction-helpers');
const { pool } = require('../../config/database');
const { validateItemForAction, handleApproval, handleRejection } = require('../../routes/approvals-helpers');
const { processFinanceApproval } = require('../../routes/approvals-finance-helpers');

jest.mock('../../config/database', () => ({
  pool: {
    connect: jest.fn(),
    query: jest.fn()
  }
}));

jest.mock('../../routes/approvals-helpers', () => ({
  validateItemForAction: jest.fn(),
  handleApproval: jest.fn(),
  handleRejection: jest.fn()
}));

jest.mock('../../routes/approvals-finance-helpers', () => ({
  processFinanceApproval: jest.fn()
}));

describe('Approvals Transaction Helpers', () => {
  let mockReq;
  let mockRes;
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);

    mockReq = {
      body: { itemId: 1, comments: 'Approved' },
      user: { id: 5 }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('handleApprovalTransaction', () => {
    test('should approve item successfully for manager', async () => {
      validateItemForAction.mockResolvedValue({
        id: 1,
        reimbursement_id: 100,
        user_id: 10
      });
      handleApproval.mockResolvedValue();

      await handleApprovalTransaction(mockReq, mockRes, {
        requiredStatus: 'pending',
        approvalLevel: 'manager',
        newStatus: 'approved_by_manager',
        reimbursementStatus: 'pending approval',
        successMessage: 'Approved successfully'
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Approved successfully'
      });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should approve item successfully for finance', async () => {
      validateItemForAction.mockResolvedValue({
        id: 1,
        reimbursement_id: 100,
        user_id: 10
      });
      processFinanceApproval.mockResolvedValue();

      await handleApprovalTransaction(mockReq, mockRes, {
        requiredStatus: 'approved_by_hr',
        approvalLevel: 'finance',
        newStatus: 'approved_by_finance',
        reimbursementStatus: 'pending approval',
        successMessage: 'Finance approved successfully'
      });

      expect(processFinanceApproval).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should return error when item not found', async () => {
      validateItemForAction.mockResolvedValue(null);

      await handleApprovalTransaction(mockReq, mockRes, {
        requiredStatus: 'pending',
        approvalLevel: 'manager',
        newStatus: 'approved_by_manager',
        reimbursementStatus: 'pending approval',
        errorMessage: 'Item not found'
      });

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    test('should handle database errors', async () => {
      validateItemForAction.mockRejectedValue(new Error('Database error'));

      await handleApprovalTransaction(mockReq, mockRes, {
        requiredStatus: 'pending',
        approvalLevel: 'manager',
        newStatus: 'approved_by_manager',
        reimbursementStatus: 'pending approval'
      });

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('handleRejectionTransaction', () => {
    test('should reject item successfully', async () => {
      validateItemForAction.mockResolvedValue({
        id: 1,
        reimbursement_id: 100,
        user_id: 10
      });
      handleRejection.mockResolvedValue();

      await handleRejectionTransaction(mockReq, mockRes, {
        requiredStatus: 'pending',
        approvalLevel: 'manager',
        newStatus: 'rejected_by_manager',
        reimbursementStatus: 'partially_approved'
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String)
      });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });
});

