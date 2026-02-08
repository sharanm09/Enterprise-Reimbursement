// Helper to enrich items with approvals and attachments - reduces duplication
const { pool } = require('../config/database');

async function enrichItemWithApprovalsAndAttachments(item, approvalLevel = null) {
  const approvalQuery = approvalLevel
    ? `SELECT ra.*, u.display_name as approver_name
       FROM reimbursement_approvals ra
       LEFT JOIN users u ON ra.approver_id = u.id
       WHERE ra.reimbursement_item_id = $1 AND ra.approval_level = $2
       ORDER BY ra.created_at ASC`
    : `SELECT ra.*, u.display_name as approver_name
       FROM reimbursement_approvals ra
       LEFT JOIN users u ON ra.approver_id = u.id
       WHERE ra.reimbursement_item_id = $1
       ORDER BY ra.created_at ASC`;

  const approvalParams = approvalLevel ? [item.item_id, approvalLevel] : [item.item_id];
  const approvalsResult = await pool.query(approvalQuery, approvalParams).catch(() => ({ rows: [] }));

  const attachmentsResult = await pool.query(`
    SELECT id, file_name, file_path, file_type, file_size
    FROM reimbursement_attachments
    WHERE reimbursement_item_id = $1 OR reimbursement_id = $2
  `, [item.item_id, item.reimbursement_id]).catch(() => ({ rows: [] }));

  return {
    ...item,
    approvals: approvalsResult.rows || [],
    attachments: attachmentsResult.rows || []
  };
}

async function enrichItemsWithApprovalsAndAttachments(items, approvalLevel = null) {
  return Promise.all(items.map(item => enrichItemWithApprovalsAndAttachments(item, approvalLevel)));
}

module.exports = {
  enrichItemWithApprovalsAndAttachments,
  enrichItemsWithApprovalsAndAttachments
};


