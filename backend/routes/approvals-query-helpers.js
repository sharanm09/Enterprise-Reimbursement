// Query builder helpers for approvals.js to reduce duplication
const { BASE_ITEM_SELECT } = require('./approvals-helpers');

function buildPendingItemsQuery(role, managerId = null) {
  let query = `${BASE_ITEM_SELECT} WHERE `;
  const params = [];

  switch (role) {
    case 'manager':
      query += `r.status IN ('submitted', 'pending approval', 'partially_approved')
        AND ri.status = 'pending'
        AND (u.manager_id = $1 OR (u.manager_id IS NULL OR u.manager_id = u.id))`;
      // Note: We don't push a second param because we rely on OR logic. 
      // Wait, params.push(managerId) is already there. correctly handles $1.
      params.push(managerId);
      break;
    case 'hr':
      // HR sees items approved by manager OR items that are pending but have no manager
      query += `(ri.status = 'approved_by_manager' 
        OR (ri.status = 'pending' AND (u.manager_id IS NULL OR u.manager_id = u.id)))
        AND ri.status NOT IN ('approved_by_hr', 'rejected_by_hr', 'approved_by_finance', 'rejected_by_finance', 'paid')`;
      break;
    case 'finance':
      query += `r.status IN ('submitted', 'pending approval', 'partially_approved')
        AND (ri.status = 'approved_by_hr' 
        OR (ri.status = 'pending' AND (u.manager_id IS NULL OR u.manager_id = u.id)))
        AND ri.status NOT IN ('approved_by_finance', 'paid', 'rejected_by_finance', 'pending', 'approved_by_manager')`;
      break;
    default:
      query += `ri.status = 'pending'`;
  }

  query += ` ORDER BY ri.created_at DESC`;
  return { query, params };
}

function buildApprovedItemsQuery(role, managerId = null, approvalLevel = null) {
  let query = `${BASE_ITEM_SELECT} WHERE `;
  const params = [];

  switch (role) {
    case 'manager':
      query += `(ri.status = 'approved_by_manager' OR ri.status = 'rejected_by_manager')
        AND u.manager_id = $1`;
      params.push(managerId);
      break;
    case 'hr':
      query += `(ri.status = 'approved_by_hr' OR ri.status = 'rejected_by_hr')`;
      break;
    case 'finance':
      query += `(ri.status = 'approved_by_finance' OR ri.status = 'paid' OR ri.status = 'rejected_by_finance')`;
      break;
    default:
      query += `ri.status IN ('approved_by_manager', 'approved_by_hr', 'approved_by_finance', 'paid')`;
  }

  query += ` ORDER BY ri.updated_at DESC`;
  return { query, params };
}

function buildSuperAdminQuery(status, approvalLevel) {
  let query = `${BASE_ITEM_SELECT} WHERE `;
  const params = [];

  switch (status) {
    case 'pending':
      if (approvalLevel === 'manager') {
        query += `ri.status = $1`;
        params.push('pending');
      } else if (approvalLevel === 'hr') {
        query += `ri.status = $1 AND NOT EXISTS (
          SELECT 1 FROM reimbursement_approvals ra 
          WHERE ra.reimbursement_item_id = ri.id 
          AND ra.approval_level = $2
        )`;
        params.push('approved_by_manager', 'hr');
      } else if (approvalLevel === 'finance') {
        query += `ri.status = $1 AND ri.status NOT IN ($2, $3, $4)`;
        params.push('approved_by_hr', 'approved_by_finance', 'paid', 'rejected_by_finance');
      }
      break;
    case 'approved':
      if (approvalLevel === 'manager') {
        query += `EXISTS (
          SELECT 1 FROM reimbursement_approvals ra 
          WHERE ra.reimbursement_item_id = ri.id 
          AND ra.approval_level = $1 
          AND ra.status = $2
        )`;
        params.push('manager', 'approved');
      } else if (approvalLevel === 'hr') {
        query += `EXISTS (
          SELECT 1 FROM reimbursement_approvals ra 
          WHERE ra.reimbursement_item_id = ri.id 
          AND ra.approval_level = $1 
          AND ra.status = $2
        )`;
        params.push('hr', 'approved');
      } else if (approvalLevel === 'finance') {
        query += `ri.status IN ($1, $2)`;
        params.push('approved_by_finance', 'paid');
      }
      break;
    case 'rejected':
      if (approvalLevel === 'manager') {
        query += `ri.status = $1`;
        params.push('rejected_by_manager');
      } else if (approvalLevel === 'hr') {
        query += `ri.status = $1`;
        params.push('rejected_by_hr');
      } else if (approvalLevel === 'finance') {
        query += `ri.status = $1`;
        params.push('rejected_by_finance');
      }
      break;
  }

  query += ` ORDER BY ri.created_at DESC`;
  return { query, params };
}

module.exports = {
  buildPendingItemsQuery,
  buildApprovedItemsQuery,
  buildSuperAdminQuery
};


