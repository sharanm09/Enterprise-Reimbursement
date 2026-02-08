// Helper functions for GET endpoints to reduce duplication
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { enrichItemsWithDetails } = require('./approvals-helpers');
const { enrichItemsWithApprovalsAndAttachments } = require('./approvals-enrichment-helpers');
const { buildPendingItemsQuery, buildApprovedItemsQuery } = require('./approvals-query-helpers');

async function handlePendingItemsRequest(req, res, role, managerId = null) {
  try {
    const { query, params } = buildPendingItemsQuery(role, managerId);
    const result = await pool.query(query, params);
    const itemsWithApprovals = await enrichItemsWithDetails(result.rows);
    res.json({ success: true, data: itemsWithApprovals });
  } catch (error) {
    logger.error(`Error fetching ${role} pending approvals:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending approvals', error: error.message });
  }
}

async function handleApprovedItemsRequest(req, res, role, managerId = null, approvalLevel = null) {
  try {
    const { query, params } = buildApprovedItemsQuery(role, managerId, approvalLevel);
    const result = await pool.query(query, params);
    const itemsWithApprovals = await enrichItemsWithApprovalsAndAttachments(result.rows, approvalLevel);
    res.json({ success: true, data: itemsWithApprovals });
  } catch (error) {
    logger.error(`Error fetching ${role} approved/rejected items:`, error);
    res.status(500).json({ success: false, message: 'Failed to fetch approved/rejected items', error: error.message });
  }
}

module.exports = {
  handlePendingItemsRequest,
  handleApprovedItemsRequest
};

