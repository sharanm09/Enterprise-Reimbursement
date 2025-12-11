const { handlePendingItemsRequest, handleApprovedItemsRequest } = require('../../routes/approvals-get-helpers');
const { pool } = require('../../config/database');
const { buildPendingItemsQuery, buildApprovedItemsQuery } = require('../../routes/approvals-query-helpers');
const { enrichItemsWithDetails } = require('../../routes/approvals-helpers');
const { enrichItemsWithApprovalsAndAttachments } = require('../../routes/approvals-enrichment-helpers');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../routes/approvals-query-helpers', () => ({
  buildPendingItemsQuery: jest.fn(),
  buildApprovedItemsQuery: jest.fn()
}));

jest.mock('../../routes/approvals-helpers', () => ({
  enrichItemsWithDetails: jest.fn()
}));

jest.mock('../../routes/approvals-enrichment-helpers', () => ({
  enrichItemsWithApprovalsAndAttachments: jest.fn()
}));

describe('Approvals GET Helpers', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      user: { id: 1 }
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('handlePendingItemsRequest', () => {
    test('should fetch and enrich pending items', async () => {
      buildPendingItemsQuery.mockReturnValue({
        query: 'SELECT * FROM items WHERE status = $1',
        params: ['pending']
      });
      pool.query.mockResolvedValue({ rows: [{ id: 1 }] });
      enrichItemsWithDetails.mockResolvedValue([{ id: 1, enriched: true }]);

      await handlePendingItemsRequest(mockReq, mockRes, 'manager', 1);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, enriched: true }]
      });
    });

    test('should handle errors', async () => {
      buildPendingItemsQuery.mockReturnValue({
        query: 'SELECT * FROM items',
        params: []
      });
      pool.query.mockRejectedValue(new Error('Database error'));

      await handlePendingItemsRequest(mockReq, mockRes, 'hr');

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('handleApprovedItemsRequest', () => {
    test('should fetch and enrich approved items', async () => {
      buildApprovedItemsQuery.mockReturnValue({
        query: 'SELECT * FROM items WHERE status = $1',
        params: ['approved']
      });
      pool.query.mockResolvedValue({ rows: [{ id: 1 }] });
      enrichItemsWithApprovalsAndAttachments.mockResolvedValue([{ id: 1, approvals: [] }]);

      await handleApprovedItemsRequest(mockReq, mockRes, 'manager', 1, 'manager');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, approvals: [] }]
      });
    });
  });
});


