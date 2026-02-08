const request = require('supertest');
const express = require('express');
const { handleSuperAdminApprovalRequest } = require('../../routes/approvals-superadmin-helpers');
const { pool } = require('../../config/database');
const { buildSuperAdminQuery } = require('../../routes/approvals-query-helpers');
const { enrichItemsWithApprovalsAndAttachments } = require('../../routes/approvals-enrichment-helpers');
const logger = require('../../utils/logger');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../routes/approvals-query-helpers', () => ({
  buildSuperAdminQuery: jest.fn()
}));

jest.mock('../../routes/approvals-enrichment-helpers', () => ({
  enrichItemsWithApprovalsAndAttachments: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
  error: jest.fn()
}));

describe('Approvals Superadmin Helpers', () => {
  let app;
  let req;
  let res;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.params = { status: 'pending' };
      next();
    });
    jest.clearAllMocks();
  });

  describe('handleSuperAdminApprovalRequest', () => {
    test('should handle pending manager approvals', async () => {
      buildSuperAdminQuery.mockReturnValue({
        query: 'SELECT * FROM reimbursement_items WHERE status = $1',
        params: ['pending']
      });
      pool.query.mockResolvedValue({
        rows: [{ item_id: 1, status: 'pending' }]
      });
      enrichItemsWithApprovalsAndAttachments.mockResolvedValue([
        { item_id: 1, approvals: [], attachments: [] }
      ]);

      req = {
        params: { status: 'pending' }
      };
      res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await handleSuperAdminApprovalRequest(req, res, 'manager');

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ item_id: 1, approvals: [], attachments: [] }]
      });
    });

    test('should handle approved hr approvals', async () => {
      buildSuperAdminQuery.mockReturnValue({
        query: 'SELECT * FROM reimbursement_items',
        params: []
      });
      pool.query.mockResolvedValue({
        rows: [{ item_id: 1, status: 'approved_by_hr' }]
      });
      enrichItemsWithApprovalsAndAttachments.mockResolvedValue([
        { item_id: 1, approvals: [], attachments: [] }
      ]);

      req = {
        params: { status: 'approved' }
      };
      res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await handleSuperAdminApprovalRequest(req, res, 'hr');

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ item_id: 1, approvals: [], attachments: [] }]
      });
    });

    test('should handle rejected finance approvals', async () => {
      buildSuperAdminQuery.mockReturnValue({
        query: 'SELECT * FROM reimbursement_items',
        params: []
      });
      pool.query.mockResolvedValue({
        rows: [{ item_id: 1, status: 'rejected_by_finance' }]
      });
      enrichItemsWithApprovalsAndAttachments.mockResolvedValue([
        { item_id: 1, approvals: [], attachments: [] }
      ]);

      req = {
        params: { status: 'rejected' }
      };
      res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await handleSuperAdminApprovalRequest(req, res, 'finance');

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ item_id: 1, approvals: [], attachments: [] }]
      });
    });

    test('should return 400 for invalid status', async () => {
      req = {
        params: { status: 'invalid' }
      };
      res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await handleSuperAdminApprovalRequest(req, res, 'manager');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid status. Use: pending, approved, or rejected'
      });
    });

    test('should handle database errors', async () => {
      buildSuperAdminQuery.mockReturnValue({
        query: 'SELECT * FROM reimbursement_items',
        params: []
      });
      pool.query.mockRejectedValue(new Error('Database error'));

      req = {
        params: { status: 'pending' }
      };
      res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await handleSuperAdminApprovalRequest(req, res, 'manager');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
