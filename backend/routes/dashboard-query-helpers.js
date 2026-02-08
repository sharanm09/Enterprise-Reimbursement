// Helper functions to reduce duplicate query patterns in dashboard-helpers.js
const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function executeStatsQuery(query, params, defaultValue = null) {
  const defaultVal = defaultValue || { count: '0', total: '0' };
  const result = await pool.query(query, params).catch(() => ({ rows: [defaultVal] }));
  return {
    count: Number.parseInt(result.rows[0]?.count, 10) || 0,
    amount: Number.parseFloat(result.rows[0]?.total) || 0
  };
}

async function getApprovedStatsByStatus(statuses, usePaidAmount = false) {
  const amountField = usePaidAmount ? 'COALESCE(ri.paid_amount, ri.amount)' : 'ri.amount';
  const statusList = Array.isArray(statuses) ? statuses : [statuses];
  const statusCondition = statusList.map((_, i) => `$${i + 1}`).join(', ');
  
  const query = `
    SELECT COUNT(*) as count, COALESCE(SUM(${amountField}), 0) as total
    FROM reimbursement_items ri
    INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
    WHERE ri.status IN (${statusCondition})
  `;
  
  return executeStatsQuery(query, statusList);
}

module.exports = {
  executeStatsQuery,
  getApprovedStatsByStatus
};

