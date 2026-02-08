// Helper functions for finance approval logic to reduce duplication
async function processFinanceApproval(client, itemId, approverId, comments, reimbursementId) {
  await client.query(`
    UPDATE reimbursement_items
    SET status = 'approved_by_finance', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
  `, [itemId]);

  await client.query(`
    INSERT INTO reimbursement_approvals (reimbursement_item_id, approver_id, approval_level, status, comments)
    VALUES ($1, $2, $3, $4, $5)
  `, [itemId, approverId, 'finance', 'approved', comments || null]);

  const allItemsResult = await client.query(`
    SELECT status FROM reimbursement_items WHERE reimbursement_id = $1
  `, [reimbursementId]);

  const allApproved = allItemsResult.rows.every(itemRow => 
    itemRow.status === 'approved_by_finance' || itemRow.status === 'paid'
  );
  const hasRejected = allItemsResult.rows.some(itemRow => 
    itemRow.status?.includes('rejected')
  );

  const reimbursementStatus = (allApproved && !hasRejected) ? 'fully_approved' : 'partially_approved';
  await client.query(`
    UPDATE reimbursements
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [reimbursementStatus, reimbursementId]);
}

module.exports = {
  processFinanceApproval
};


