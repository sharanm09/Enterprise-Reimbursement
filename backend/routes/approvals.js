const express = require('express');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { isAuthenticated } = require('../middleware/auth');
const { isFinance, isHR, isManager, isSuperAdmin } = require('../middleware/roleChecks');
const {
  BASE_ITEM_SELECT,
  enrichItemsWithDetails,
  handleApproval,
  handleRejection,
  validateItemForAction
} = require('./approvals-helpers');
const {
  enrichItemsWithApprovalsAndAttachments
} = require('./approvals-enrichment-helpers');
const router = express.Router();

router.get('/manager/pending', isManager, async (req, res) => {
  const { handlePendingItemsRequest } = require('./approvals-get-helpers');
  await handlePendingItemsRequest(req, res, 'manager', req.user.id);
});

router.post('/manager/approve', isManager, async (req, res) => {
  const { handleApprovalTransaction } = require('./approvals-transaction-helpers');
  await handleApprovalTransaction(req, res, {
    requiredStatus: 'pending',
    notInStatuses: null,
    managerCheck: true,
    approvalLevel: 'manager',
    newStatus: 'approved_by_manager',
    reimbursementStatus: 'pending approval',
    successMessage: 'Item approved by manager successfully',
    errorMessage: 'Item not found or not ready for manager approval'
  });
});

router.post('/manager/reject', isManager, async (req, res) => {
  const { handleRejectionTransaction } = require('./approvals-transaction-helpers');
  await handleRejectionTransaction(req, res, {
    requiredStatus: 'pending',
    notInStatuses: ['approved_by_manager', 'approved_by_hr', 'approved_by_finance', 'paid', 'rejected_by_manager', 'rejected_by_hr', 'rejected_by_finance'],
    managerCheck: true,
    approvalLevel: 'manager',
    newStatus: 'rejected_by_manager',
    reimbursementStatus: 'partially_approved',
    successMessage: 'Item rejected by manager successfully',
    errorMessage: 'Item must be in pending status and assigned to you as manager'
  });
});

router.get('/manager/approved', isManager, async (req, res) => {
  const { handleApprovedItemsRequest } = require('./approvals-get-helpers');
  await handleApprovedItemsRequest(req, res, 'manager', req.user.id, 'manager');
});

router.get('/hr/pending', isHR, async (req, res) => {
  const { handlePendingItemsRequest } = require('./approvals-get-helpers');
  await handlePendingItemsRequest(req, res, 'hr');
});

router.post('/hr/approve', isHR, async (req, res) => {
  const { handleApprovalTransaction } = require('./approvals-transaction-helpers');
  await handleApprovalTransaction(req, res, {
    requiredStatus: 'approved_by_manager',
    notInStatuses: ['approved_by_hr', 'rejected_by_hr'],
    managerCheck: false,
    approvalLevel: 'hr',
    newStatus: 'approved_by_hr',
    reimbursementStatus: 'pending approval',
    successMessage: 'Item approved by HR successfully',
    errorMessage: 'Item not found or not ready for HR approval'
  });
});

router.post('/hr/reject', isHR, async (req, res) => {
  const { handleRejectionTransaction } = require('./approvals-transaction-helpers');
  await handleRejectionTransaction(req, res, {
    requiredStatus: 'approved_by_manager',
    notInStatuses: ['approved_by_hr', 'rejected_by_hr', 'pending', 'approved_by_finance', 'paid'],
    managerCheck: false,
    approvalLevel: 'hr',
    newStatus: 'rejected_by_hr',
    reimbursementStatus: 'partially_approved',
    successMessage: 'Item rejected by HR successfully',
    errorMessage: 'Item must be approved by Manager first before HR can reject'
  });
});

router.get('/hr/approved', isHR, async (req, res) => {
  const { handleApprovedItemsRequest } = require('./approvals-get-helpers');
  await handleApprovedItemsRequest(req, res, 'hr', null, 'hr');
});

router.get('/finance/pending', isFinance, async (req, res) => {
  const { handlePendingItemsRequest } = require('./approvals-get-helpers');
  await handlePendingItemsRequest(req, res, 'finance');
});

router.post('/finance/approve', isFinance, async (req, res) => {
  const { handleApprovalTransaction } = require('./approvals-transaction-helpers');
  await handleApprovalTransaction(req, res, {
    requiredStatus: 'approved_by_hr',
    notInStatuses: ['approved_by_finance', 'paid', 'rejected_by_finance', 'pending', 'approved_by_manager'],
    managerCheck: false,
    approvalLevel: 'finance',
    newStatus: 'approved_by_finance',
    reimbursementStatus: 'partially_approved',
    successMessage: 'Item approved successfully',
    errorMessage: 'Item must be approved by Manager and HR before Finance can approve'
  });
});

router.post('/finance/reject', isFinance, async (req, res) => {
  const { handleRejectionTransaction } = require('./approvals-transaction-helpers');
  await handleRejectionTransaction(req, res, {
    requiredStatus: 'approved_by_hr',
    notInStatuses: ['approved_by_finance', 'paid', 'rejected_by_finance', 'pending', 'approved_by_manager'],
    managerCheck: false,
    approvalLevel: 'finance',
    newStatus: 'rejected_by_finance',
    reimbursementStatus: 'partially_approved',
    successMessage: 'Item rejected successfully',
    errorMessage: 'Item must be approved by Manager and HR before Finance can reject'
  });
});

router.get('/finance/approved', isFinance, async (req, res) => {
  const { handleApprovedItemsRequest } = require('./approvals-get-helpers');
  await handleApprovedItemsRequest(req, res, 'finance', null, 'finance');
});

router.post('/finance/mark-paid', isFinance, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { itemId, paidAmount, tdsAmount, finalAmount } = req.body;

    if (!itemId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Item ID is required' });
    }

    const itemResult = await client.query(`
      SELECT ri.*, r.id as reimbursement_id, r.total_amount, r.user_id
      FROM reimbursement_items ri
      INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
      WHERE ri.id = $1 AND ri.status = 'approved_by_finance'
    `, [itemId]);

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Item not found or not approved by finance' });
    }

    const invoiceAmount = Number.parseFloat(itemResult.rows[0].amount);
    const tds = tdsAmount !== undefined && tdsAmount !== null ? Number.parseFloat(tdsAmount) : 0;
    const actualPaidAmount = paidAmount !== undefined && paidAmount !== null ? Number.parseFloat(paidAmount) : invoiceAmount;
    const final = finalAmount !== undefined && finalAmount !== null ? Number.parseFloat(finalAmount) : (actualPaidAmount - tds);

    const calculatedFinal = actualPaidAmount - tds;
    if (Math.abs(final - calculatedFinal) > 0.01) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        success: false, 
        message: `Final Amount validation failed. Expected: $${calculatedFinal.toFixed(2)} (Paid Amount: $${actualPaidAmount.toFixed(2)} - TDS: $${tds.toFixed(2)}), Provided: $${final.toFixed(2)}` 
      });
    }

    await client.query(`
      UPDATE reimbursement_items
      SET status = 'paid', paid_amount = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [actualPaidAmount, itemId]);

    const allItemsResult = await client.query(`
      SELECT status FROM reimbursement_items WHERE reimbursement_id = $1
    `, [itemResult.rows[0].reimbursement_id]);

    const allPaid = allItemsResult.rows.every(item => item.status === 'paid');

    if (allPaid) {
      await client.query(`
        UPDATE reimbursements
        SET status = 'paid', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [itemResult.rows[0].reimbursement_id]);

    }

    await client.query('COMMIT');

    res.json({ success: true, message: 'Item marked as paid successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error marking item as paid:', error);
    res.status(500).json({ success: false, message: 'Failed to mark item as paid', error: error.message });
  } finally {
    client.release();
  }
});

// Superadmin endpoints - can view all approvals (using middleware from roleChecks)

// Superadmin - Manager Approvals
router.get('/superadmin/manager/:status', isSuperAdmin, async (req, res) => {
  const { handleSuperAdminApprovalRequest } = require('./approvals-superadmin-helpers');
  await handleSuperAdminApprovalRequest(req, res, 'manager');
});

// Superadmin - HR Approvals
router.get('/superadmin/hr/:status', isSuperAdmin, async (req, res) => {
  const { handleSuperAdminApprovalRequest } = require('./approvals-superadmin-helpers');
  await handleSuperAdminApprovalRequest(req, res, 'hr');
});

// Superadmin - Finance Approvals
router.get('/superadmin/finance/:status', isSuperAdmin, async (req, res) => {
  const { handleSuperAdminApprovalRequest } = require('./approvals-superadmin-helpers');
  await handleSuperAdminApprovalRequest(req, res, 'finance');
});

module.exports = router;

