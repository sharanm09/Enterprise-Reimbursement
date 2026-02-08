const request = require('supertest');
const express = require('express');
const { handleApprovalTransaction, handleRejectionTransaction } = require('../../routes/approvals-transaction-helpers');
const { pool } = require('../../config/database');
const { validateItemForAction, handleApproval, handleRejection } = require('../../routes/approvals-helpers');
const { processFinanceApproval } = require('../../routes/approvals-finance-helpers');
const logger = require('../../utils/logger');

jest.mock('../../config/database', () => ({
  pool: {
    connect: jest.fn()
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

jest.mock('../../utils/logger', () => ({
  error: jest.fn()
}));

describe('Approvals Transaction Helpers Edge Cases', () => {
  let app;
  let mockClient;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.user = { id: 1 };
      next();
    });
    jest.clearAllMocks();

    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
  });

  describe('handleApprovalTransaction', () => {
    test('should handle finance approval with processFinanceApproval', async () => {
      validateItemForAction.mockResolvedValue({
        id: 1,
        reimbursement_id: 100,
        status: 'approved_by_hr'
      });
      processFinanceApproval.mockResolvedValue();

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // Release

      const config = {
        requiredStatus: 'approved_by_hr',
        notInStatuses: ['approved_by_finance', 'paid', 'rejected_by_finance'],
        managerCheck: false,
        approvalLevel: 'finance',
        newStatus: 'approved_by_finance',
        reimbursementStatus: 'pending approval',
        successMessage: 'Item approved by finance successfully',
        errorMessage: 'Item not found'
      };

      const req = {
        body: { itemId: 1, comments: 'Finance approved' },
        user: { id: 1 }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await handleApprovalTransaction(req, res, config);

      expect(processFinanceApproval).toHaveBeenCalledWith(mockClient, 1, 1, 'Finance approved', 100);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Item approved by finance successfully'
      });
    });

    test('should handle regular approval with handleApproval', async () => {
      validateItemForAction.mockResolvedValue({
        id: 1,
        reimbursement_id: 100,
        status: 'pending'
      });
      handleApproval.mockResolvedValue();

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // Release

      const config = {
        requiredStatus: 'pending',
        notInStatuses: [],
        managerCheck: false,
        approvalLevel: 'manager',
        newStatus: 'approved_by_manager',
        reimbursementStatus: 'pending approval',
        successMessage: 'Item approved successfully',
        errorMessage: 'Item not found'
      };

      const req = {
        body: { itemId: 1, comments: 'Approved' },
        user: { id: 1 }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await handleApprovalTransaction(req, res, config);

      expect(handleApproval).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    test('should handle validation errors', async () => {
      validateItemForAction.mockRejectedValue(new Error('Validation error'));

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce(); // ROLLBACK

      const config = {
        requiredStatus: 'pending',
        notInStatuses: [],
        managerCheck: false,
        approvalLevel: 'manager',
        newStatus: 'approved_by_manager',
        reimbursementStatus: 'pending approval',
        successMessage: 'Item approved successfully',
        errorMessage: 'Item not found'
      };

      const req = {
        body: { itemId: 1, comments: 'Approved' },
        user: { id: 1 }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await handleApprovalTransaction(req, res, config);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });

    test('should handle handleApproval errors', async () => {
      validateItemForAction.mockResolvedValue({
        id: 1,
        reimbursement_id: 100
      });
      handleApproval.mockRejectedValue(new Error('Approval failed'));

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce(); // ROLLBACK

      const config = {
        requiredStatus: 'pending',
        notInStatuses: [],
        managerCheck: false,
        approvalLevel: 'manager',
        newStatus: 'approved_by_manager',
        reimbursementStatus: 'pending approval',
        successMessage: 'Item approved successfully',
        errorMessage: 'Item not found'
      };

      const req = {
        body: { itemId: 1, comments: 'Approved' },
        user: { id: 1 }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await handleApprovalTransaction(req, res, config);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('handleRejectionTransaction', () => {
    test('should handle rejection successfully', async () => {
      validateItemForAction.mockResolvedValue({
        id: 1,
        reimbursement_id: 100,
        status: 'pending'
      });
      handleRejection.mockResolvedValue();

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce() // COMMIT
        .mockResolvedValueOnce(); // Release

      const config = {
        requiredStatus: 'pending',
        notInStatuses: [],
        managerCheck: false,
        approvalLevel: 'manager',
        newStatus: 'rejected_by_manager',
        reimbursementStatus: 'rejected',
        successMessage: 'Item rejected successfully',
        errorMessage: 'Item not found'
      };

      const req = {
        body: { itemId: 1, comments: 'Not approved' },
        user: { id: 1 }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await handleRejectionTransaction(req, res, config);

      expect(handleRejection).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Item rejected successfully'
      });
    });

    test('should handle empty comments', async () => {
      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce(); // ROLLBACK

      const config = {
        requiredStatus: 'pending',
        notInStatuses: [],
        managerCheck: false,
        approvalLevel: 'manager',
        newStatus: 'rejected_by_manager',
        reimbursementStatus: 'rejected',
        successMessage: 'Item rejected successfully',
        errorMessage: 'Item not found'
      };

      const req = {
        body: { itemId: 1, comments: '   ' },
        user: { id: 1 }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await handleRejectionTransaction(req, res, config);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Comments are required for rejection'
      });
    });

    test('should handle handleRejection errors', async () => {
      validateItemForAction.mockResolvedValue({
        id: 1,
        reimbursement_id: 100
      });
      handleRejection.mockRejectedValue(new Error('Rejection failed'));

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce(); // ROLLBACK

      const config = {
        requiredStatus: 'pending',
        notInStatuses: [],
        managerCheck: false,
        approvalLevel: 'manager',
        newStatus: 'rejected_by_manager',
        reimbursementStatus: 'rejected',
        successMessage: 'Item rejected successfully',
        errorMessage: 'Item not found'
      };

      const req = {
        body: { itemId: 1, comments: 'Not approved' },
        user: { id: 1 }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await handleRejectionTransaction(req, res, config);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });

    test('should handle client release errors', async () => {
      validateItemForAction.mockResolvedValue({
        id: 1,
        reimbursement_id: 100
      });
      handleRejection.mockResolvedValue();
      mockClient.release.mockImplementation(() => {
        throw new Error('Release failed');
      });

      mockClient.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce(); // COMMIT

      const config = {
        requiredStatus: 'pending',
        notInStatuses: [],
        managerCheck: false,
        approvalLevel: 'manager',
        newStatus: 'rejected_by_manager',
        reimbursementStatus: 'rejected',
        successMessage: 'Item rejected successfully',
        errorMessage: 'Item not found'
      };

      const req = {
        body: { itemId: 1, comments: 'Not approved' },
        user: { id: 1 }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await handleRejectionTransaction(req, res, config);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Item rejected successfully'
      });
    });
  });
});


