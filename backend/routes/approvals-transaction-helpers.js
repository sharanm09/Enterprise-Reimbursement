// Common transaction handlers to reduce duplication in approval/rejection endpoints
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { validateItemForAction, handleApproval, handleRejection } = require('./approvals-helpers');
const { processFinanceApproval } = require('./approvals-finance-helpers');

async function handleApprovalTransaction(req, res, config) {
  const {
    requiredStatus,
    notInStatuses,
    managerCheck,
    approvalLevel,
    newStatus,
    reimbursementStatus,
    successMessage,
    errorMessage
  } = config;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { itemId, comments } = req.body;
    const approverId = req.user.id;

    if (!itemId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Item ID is required' });
    }

    const item = await validateItemForAction(client, itemId, approverId, requiredStatus, notInStatuses, managerCheck);
    if (!item) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: errorMessage });
    }

    if (approvalLevel === 'finance' && newStatus === 'approved_by_finance') {
      await processFinanceApproval(client, itemId, approverId, comments, item.reimbursement_id);
    } else {
      await handleApproval(client, {
        itemId,
        approverId,
        approvalLevel,
        newStatus,
        comments,
        reimbursementStatus,
        reimbursementId: item.reimbursement_id
      });
    }

    await client.query('COMMIT');
    res.json({ success: true, message: successMessage });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error approving item:', error);
    res.status(500).json({ success: false, message: 'Failed to approve item', error: error.message });
  } finally {
    client.release();
  }
}

async function handleRejectionTransaction(req, res, config) {
  const {
    requiredStatus,
    notInStatuses,
    managerCheck,
    approvalLevel,
    newStatus,
    reimbursementStatus,
    successMessage,
    errorMessage
  } = config;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { itemId, comments } = req.body;
    const approverId = req.user.id;

    if (!itemId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Item ID is required' });
    }

    if (!comments || comments.trim().length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Comments are required for rejection' });
    }

    const item = await validateItemForAction(client, itemId, approverId, requiredStatus, notInStatuses, managerCheck);
    if (!item) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: errorMessage });
    }

    await handleRejection(client, {
      itemId,
      approverId,
      approvalLevel,
      newStatus,
      comments,
      reimbursementStatus,
      reimbursementId: item.reimbursement_id
    });

    await client.query('COMMIT');
    res.json({ success: true, message: successMessage });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error rejecting item:', error);
    res.status(500).json({ success: false, message: 'Failed to reject item', error: error.message });
  } finally {
    client.release();
  }
}

module.exports = {
  handleApprovalTransaction,
  handleRejectionTransaction
};


