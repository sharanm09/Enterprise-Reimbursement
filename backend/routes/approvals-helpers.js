// Helper functions to reduce duplication in approvals.js
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// Common SELECT query for reimbursement items with all joins
const BASE_ITEM_SELECT = `
  SELECT 
    ri.id as item_id,
    ri.reimbursement_id,
    ri.expense_type,
    ri.amount,
    ri.paid_amount,
    ri.description,
    ri.expense_date,
    ri.meal_type,
    ri.people_count,
    ri.travel_purpose,
    ri.lodging_city,
    ri.status as item_status,
    ec.name as expense_category_name,
    r.user_id,
    r.department_id,
    r.cost_center_id,
    r.project_id,
    r.request_date,
    r.total_amount,
    r.status as reimbursement_status,
    u.display_name as user_name,
    u.email as user_email,
    u.manager_id,
    d.name as department_name,
    cc.name as cost_center_name,
    p.name as project_name
  FROM reimbursement_items ri
  INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
  LEFT JOIN expense_categories ec ON ri.expense_category_id = ec.id
  LEFT JOIN users u ON r.user_id = u.id
  LEFT JOIN departments d ON r.department_id = d.id
  LEFT JOIN cost_centers cc ON r.cost_center_id = cc.id
  LEFT JOIN projects p ON r.project_id = p.id
`;

// Fetch approvals and attachments for items (uses enrichment helper to avoid duplication)
async function enrichItemsWithDetails(items) {
  const { enrichItemsWithApprovalsAndAttachments } = require('./approvals-enrichment-helpers');
  return enrichItemsWithApprovalsAndAttachments(items);
}

// Common approval handler - using config object to reduce parameter count
async function handleApproval(client, config) {
  const { itemId, approverId, approvalLevel, newStatus, comments, reimbursementStatus, reimbursementId } = config;
  
  await client.query(`
    UPDATE reimbursement_items
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [newStatus, itemId]);

  await client.query(`
    INSERT INTO reimbursement_approvals (reimbursement_item_id, approver_id, approval_level, status, comments)
    VALUES ($1, $2, $3, $4, $5)
  `, [itemId, approverId, approvalLevel, 'approved', comments || null]);

  await client.query(`
    UPDATE reimbursements
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [reimbursementStatus, reimbursementId]);
}

// Common rejection handler - using config object to reduce parameter count
async function handleRejection(client, config) {
  const { itemId, approverId, approvalLevel, newStatus, comments, reimbursementStatus, reimbursementId } = config;
  
  await client.query(`
    UPDATE reimbursement_items
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [newStatus, itemId]);

  await client.query(`
    INSERT INTO reimbursement_approvals (reimbursement_item_id, approver_id, approval_level, status, comments)
    VALUES ($1, $2, $3, $4, $5)
  `, [itemId, approverId, approvalLevel, 'rejected', comments]);

  await client.query(`
    UPDATE reimbursements
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [reimbursementStatus, reimbursementId]);
}

// Validate item for approval/rejection
async function validateItemForAction(client, itemId, approverId, requiredStatus, notInStatuses, managerCheck = false) {
  let query = `
    SELECT ri.*, r.user_id, r.status as reimbursement_status, r.id as reimbursement_id
    FROM reimbursement_items ri
    INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
  `;
  
  const params = [itemId];
  
  if (managerCheck) {
    query += ` LEFT JOIN users u ON r.user_id = u.id WHERE ri.id = $1 AND ri.status = $2 AND u.manager_id = $3`;
    params.push(requiredStatus, approverId);
  } else {
    query += ` WHERE ri.id = $1 AND ri.status = $2`;
    params.push(requiredStatus);
  }
  
  if (notInStatuses && notInStatuses.length > 0) {
    const paramOffset = params.length;
    const placeholders = notInStatuses.map((_, i) => `$${paramOffset + i + 1}`).join(', ');
    query += ` AND ri.status NOT IN (${placeholders})`;
    params.push(...notInStatuses);
  }
  
  const result = await client.query(query, params);
  return result.rows[0] || null;
}

module.exports = {
  BASE_ITEM_SELECT,
  enrichItemsWithDetails,
  handleApproval,
  handleRejection,
  validateItemForAction
};

