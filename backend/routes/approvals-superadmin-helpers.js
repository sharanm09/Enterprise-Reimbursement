// Helper function for superadmin approval endpoints to reduce duplication
const { pool } = require('../config/database');
const { buildSuperAdminQuery } = require('./approvals-query-helpers');
const { enrichItemsWithApprovalsAndAttachments } = require('./approvals-enrichment-helpers');
const logger = require('../utils/logger');

async function handleSuperAdminApprovalRequest(req, res, approvalLevel) {
  try {
    const { status } = req.params;
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Use: pending, approved, or rejected' });
    }
    
    const { query, params } = buildSuperAdminQuery(status, approvalLevel);
    const result = await pool.query(query, params);
    const itemsWithApprovals = await enrichItemsWithApprovalsAndAttachments(result.rows, approvalLevel);

    res.json({ success: true, data: itemsWithApprovals });
  } catch (error) {
    logger.error(`Error fetching superadmin ${approvalLevel} ${req.params.status} approvals:`, error);
    res.status(500).json({ success: false, message: `Failed to fetch ${req.params.status} approvals`, error: error.message });
  }
}

module.exports = {
  handleSuperAdminApprovalRequest
};


