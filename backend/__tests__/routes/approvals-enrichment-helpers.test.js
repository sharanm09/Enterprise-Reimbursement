const {
  enrichItemWithApprovalsAndAttachments,
  enrichItemsWithApprovalsAndAttachments
} = require('../../routes/approvals-enrichment-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Approvals Enrichment Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enrichItemWithApprovalsAndAttachments', () => {
    test('should enrich item with approvals and attachments', async () => {
      const item = {
        item_id: 1,
        reimbursement_id: 100
      };

      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              approver_id: 10,
              approval_level: 'manager',
              status: 'approved',
              approver_name: 'Manager Name'
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              file_name: 'receipt.jpg',
              file_path: '/uploads/receipt.jpg',
              file_type: 'image/jpeg',
              file_size: 1024
            }
          ]
        });

      const result = await enrichItemWithApprovalsAndAttachments(item);

      expect(result.approvals).toHaveLength(1);
      expect(result.attachments).toHaveLength(1);
      expect(result.approvals[0].approver_name).toBe('Manager Name');
    });

    test('should enrich item with approvals filtered by approval level', async () => {
      const item = {
        item_id: 1,
        reimbursement_id: 100
      };

      pool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              approver_id: 10,
              approval_level: 'hr',
              status: 'approved',
              approver_name: 'HR Name'
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: []
        });

      const result = await enrichItemWithApprovalsAndAttachments(item, 'hr');

      expect(result.approvals).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('approval_level = $2'),
        [1, 'hr']
      );
    });

    test('should handle database errors gracefully', async () => {
      const item = {
        item_id: 1,
        reimbursement_id: 100
      };

      pool.query
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ rows: [] });

      const result = await enrichItemWithApprovalsAndAttachments(item);

      expect(result.approvals).toEqual([]);
      expect(result.attachments).toEqual([]);
    });

    test('should handle missing attachments', async () => {
      const item = {
        item_id: 1,
        reimbursement_id: 100
      };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await enrichItemWithApprovalsAndAttachments(item);

      expect(result.approvals).toEqual([]);
      expect(result.attachments).toEqual([]);
    });
  });

  describe('enrichItemsWithApprovalsAndAttachments', () => {
    test('should enrich multiple items', async () => {
      const items = [
        { item_id: 1, reimbursement_id: 100 },
        { item_id: 2, reimbursement_id: 101 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await enrichItemsWithApprovalsAndAttachments(items);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('approvals');
      expect(result[1]).toHaveProperty('approvals');
    });

    test('should enrich items with approval level filter', async () => {
      const items = [
        { item_id: 1, reimbursement_id: 100 }
      ];

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await enrichItemsWithApprovalsAndAttachments(items, 'finance');

      expect(result).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('approval_level = $2'),
        [1, 'finance']
      );
    });
  });
});
