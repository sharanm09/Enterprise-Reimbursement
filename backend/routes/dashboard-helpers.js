// Helper functions to reduce cognitive complexity in dashboard.js
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { getApprovedStatsByStatus } = require('./dashboard-query-helpers');

async function getUserStats(userId, buildDateFilter) {
  // Removed unused myPendingReimbursementsResult query

  const dateFilter3 = buildDateFilter(1);
  const myApprovedParams = [userId, ...dateFilter3.params];
  const myApprovedReimbursementsResult = await pool.query(`
    SELECT COUNT(DISTINCT r.id) as count, COALESCE(SUM(COALESCE(ri.paid_amount, ri.amount)), 0) as total 
    FROM reimbursements r
    INNER JOIN reimbursement_items ri ON ri.reimbursement_id = r.id
    WHERE r.user_id = $1 
      AND ri.status IN ('approved_by_finance', 'paid')
      ${dateFilter3.filter}
  `, myApprovedParams).catch(() => ({ rows: [{ count: '0', total: '0' }] }));

  const dateFilter4 = buildDateFilter(1);
  const myRejectedParams = [userId, ...dateFilter4.params];
  const myRejectedReimbursementsResult = await pool.query(`
    SELECT COUNT(DISTINCT r.id) as count, COALESCE(SUM(ri.amount), 0) as total 
    FROM reimbursements r
    INNER JOIN reimbursement_items ri ON ri.reimbursement_id = r.id
    WHERE r.user_id = $1 
      AND ri.status IN ('rejected_by_manager', 'rejected_by_hr', 'rejected_by_finance')
      ${dateFilter4.filter}
  `, myRejectedParams).catch(() => ({ rows: [{ count: '0', total: '0' }] }));

  const dateFilter5 = buildDateFilter(1);
  const myTotalParams = [userId, ...dateFilter5.params];
  const myTotalReimbursementsResult = await pool.query(` 
    SELECT COALESCE(SUM(total_amount), 0) as total 
    FROM reimbursements r
    WHERE r.user_id = $1${dateFilter5.filter}
  `, myTotalParams).catch(() => ({ rows: [{ total: '0' }] }));

  return {
    myApprovedCount: Number.parseInt(myApprovedReimbursementsResult.rows[0]?.count, 10) || 0,
    myApprovedAmount: Number.parseFloat(myApprovedReimbursementsResult.rows[0]?.total) || 0,
    myRejectedCount: Number.parseInt(myRejectedReimbursementsResult.rows[0]?.count, 10) || 0,
    myRejectedAmount: Number.parseFloat(myRejectedReimbursementsResult.rows[0]?.total) || 0,
    myTotalAmount: Number.parseFloat(myTotalReimbursementsResult.rows[0]?.total) || 0
  };
}

async function getFinancePendingApprovals(dateFilterPending) {
  const financePendingParams = dateFilterPending.params;
  const financePendingResult = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(ri.amount), 0) as total
    FROM reimbursement_items ri
    INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
    WHERE ri.status = 'approved_by_hr'
      AND ri.status NOT IN ('approved_by_finance', 'paid', 'rejected_by_finance')
          ${dateFilterPending.filter.replaceAll(/\$(\d+)/g, (match, num) => `$${Number.parseInt(num, 10)}`)}
  `, financePendingParams).catch(() => ({ rows: [{ count: '0', total: '0' }] }));
  return {
    count: Number.parseInt(financePendingResult.rows[0]?.count, 10) || 0,
    amount: Number.parseFloat(financePendingResult.rows[0]?.total) || 0
  };
}

async function getHRPendingApprovals(dateFilterPending) {
  const hrPendingParams = dateFilterPending.params;
  const hrPendingResult = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(ri.amount), 0) as total
    FROM reimbursement_items ri
    INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
    WHERE ri.status = 'approved_by_manager'
      AND ri.status NOT IN ('approved_by_hr', 'rejected_by_hr')
          ${dateFilterPending.filter.replaceAll(/\$(\d+)/g, (match, num) => `$${Number.parseInt(num, 10)}`)}
  `, hrPendingParams).catch(() => ({ rows: [{ count: '0', total: '0' }] }));
  return {
    count: Number.parseInt(hrPendingResult.rows[0]?.count, 10) || 0,
    amount: Number.parseFloat(hrPendingResult.rows[0]?.total) || 0
  };
}

async function getManagerPendingApprovals(dateFilterPending) {
  const managerPendingParams = dateFilterPending.params;
  const managerPendingResult = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(ri.amount), 0) as total
    FROM reimbursement_items ri
    INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
    WHERE ri.status = 'pending'
      AND ri.status NOT IN ('approved_by_manager', 'rejected_by_manager')
          ${dateFilterPending.filter.replaceAll(/\$(\d+)/g, (match, num) => `$${Number.parseInt(num, 10)}`)}
  `, managerPendingParams).catch(() => ({ rows: [{ count: '0', total: '0' }] }));
  return {
    count: Number.parseInt(managerPendingResult.rows[0]?.count, 10) || 0,
    amount: Number.parseFloat(managerPendingResult.rows[0]?.total) || 0
  };
}

async function getSuperAdminPendingApprovals(dateFilterPending) {
  const superAdminPendingParams = dateFilterPending.params;
  const superAdminPendingResult = await pool.query(`
    SELECT COUNT(*) as count, COALESCE(SUM(ri.amount), 0) as total
    FROM reimbursement_items ri
    INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
    WHERE ri.status IN ('pending', 'approved_by_manager', 'approved_by_hr')
      AND ri.status NOT IN ('approved_by_finance', 'paid', 'rejected_by_finance', 'rejected_by_hr', 'rejected_by_manager')
          ${dateFilterPending.filter.replaceAll(/\$(\d+)/g, (match, num) => `$${Number.parseInt(num, 10)}`)}
  `, superAdminPendingParams).catch(() => ({ rows: [{ count: '0', total: '0' }] }));
  return {
    count: Number.parseInt(superAdminPendingResult.rows[0]?.count, 10) || 0,
    amount: Number.parseFloat(superAdminPendingResult.rows[0]?.total) || 0
  };
}

async function getPendingApprovalsStats(userId, isSuperAdmin, isFinance, isHR, isManager, buildDateFilter) {
  let pendingApprovalsCount = 0;
  let pendingApprovalsAmount = 0;

  try {
    const dateFilterPending = buildDateFilter(0);
    if (isFinance) {
      const result = await getFinancePendingApprovals(dateFilterPending);
      pendingApprovalsCount = result.count;
      pendingApprovalsAmount = result.amount;
    } else if (isHR) {
      const result = await getHRPendingApprovals(dateFilterPending);
      pendingApprovalsCount = result.count;
      pendingApprovalsAmount = result.amount;
    } else if (isManager) {
      const result = await getManagerPendingApprovals(dateFilterPending);
      pendingApprovalsCount = result.count;
      pendingApprovalsAmount = result.amount;
    } else {
      const result = await getSuperAdminPendingApprovals(dateFilterPending);
      pendingApprovalsCount = result.count;
      pendingApprovalsAmount = result.amount;
    }
  } catch (error) {
    logger.warn('Error calculating pending approvals', error);
  }

  return { pendingApprovalsCount, pendingApprovalsAmount };
}

async function getApprovedStats(isSuperAdmin, isFinance, isHR, isManager) {
  let approvedCount = 0;
  let approvedAmount = 0;

  try {
    if (isFinance || isSuperAdmin) {
      const stats = await getApprovedStatsByStatus(['approved_by_finance', 'paid'], true);
      approvedCount = stats.count;
      approvedAmount = stats.amount;
    } else if (isHR) {
      const stats = await getApprovedStatsByStatus(['approved_by_hr'], false);
      approvedCount = stats.count;
      approvedAmount = stats.amount;
    } else if (isManager) {
      const stats = await getApprovedStatsByStatus(['approved_by_manager'], false);
      approvedCount = stats.count;
      approvedAmount = stats.amount;
    }
  } catch (error) {
    logger.warn('Error calculating approved items', error);
  }

  return { approvedCount, approvedAmount };
}

async function getRejectedStats(userId, isSuperAdmin, isFinance, isHR, isManager) {
  let rejectedCount = 0;
  let rejectedAmount = 0;

  try {
    if (isSuperAdmin) {
      const superAdminRejectedResult = await pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(ri.amount), 0) as total
        FROM reimbursement_items ri
        INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
        WHERE ri.status IN ('rejected_by_manager', 'rejected_by_hr', 'rejected_by_finance')
      `).catch(() => ({ rows: [{ count: '0', total: '0' }] }));
      rejectedCount = Number.parseInt(superAdminRejectedResult.rows[0]?.count, 10) || 0;
      rejectedAmount = Number.parseFloat(superAdminRejectedResult.rows[0]?.total) || 0;
    } else if (isFinance || isHR) {
      const rejectedResult = await pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(ri.amount), 0) as total
        FROM reimbursement_items ri
        INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
        WHERE ri.status IN ('rejected_by_manager', 'rejected_by_hr', 'rejected_by_finance')
      `).catch(() => ({ rows: [{ count: '0', total: '0' }] }));
      rejectedCount = Number.parseInt(rejectedResult.rows[0]?.count, 10) || 0;
      rejectedAmount = Number.parseFloat(rejectedResult.rows[0]?.total) || 0;
    } else if (isManager) {
      const rejectedResult = await pool.query(`
        SELECT COUNT(*) as count, COALESCE(SUM(ri.amount), 0) as total
        FROM reimbursement_items ri
        INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE ri.status IN ('rejected_by_manager', 'rejected_by_hr', 'rejected_by_finance')
          AND u.manager_id = $1
      `, [userId]).catch(() => ({ rows: [{ count: '0', total: '0' }] }));
      rejectedCount = Number.parseInt(rejectedResult.rows[0]?.count, 10) || 0;
      rejectedAmount = Number.parseFloat(rejectedResult.rows[0]?.total) || 0;
    }
  } catch (error) {
    logger.warn('Error calculating rejected items', error);
  }

  return { rejectedCount, rejectedAmount };
}

function buildRoleFilterQuery(isSuperAdmin, isFinance, isManager, isHR, userId) {
  if (isSuperAdmin || isFinance) {
    return { query: '', params: [] };
  }
  if (isManager) {
    return {
      query: ` AND EXISTS (SELECT 1 FROM users u WHERE u.id = r.user_id AND u.manager_id = $1)`,
      params: [userId]
    };
  }
  if (isHR) {
    return {
      query: ` AND EXISTS (SELECT 1 FROM users u WHERE u.id = r.user_id AND u.manager_id IN (SELECT id FROM users WHERE role = 'manager'))`,
      params: []
    };
  }
  return {
    query: ` AND r.user_id = $1`,
    params: [userId]
  };
}

async function getMonthlyTrendData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter) {
  const hasUserIdParam = !isSuperAdmin && !isFinance;
  const dateFilter = buildDateFilter(hasUserIdParam ? 1 : 0);
  const roleFilter = buildRoleFilterQuery(isSuperAdmin, isFinance, isManager, isHR, userId);
  
  let query = `
    SELECT 
      TO_CHAR(DATE_TRUNC('month', r.created_at), 'Mon YYYY') as month,
      COUNT(DISTINCT r.id) as count,
      COALESCE(SUM(ri.amount), 0) as total_amount
    FROM reimbursements r
    LEFT JOIN reimbursement_items ri ON ri.reimbursement_id = r.id
    WHERE r.created_at >= NOW() - INTERVAL '6 months'
    ${roleFilter.query}
    ${dateFilter.filter}
    GROUP BY DATE_TRUNC('month', r.created_at) 
    ORDER BY DATE_TRUNC('month', r.created_at)
  `;
  
  const params = hasUserIdParam ? [userId, ...roleFilter.params, ...dateFilter.params] : [...roleFilter.params, ...dateFilter.params];
  const result = await pool.query(query, params).catch(() => ({ rows: [] }));
  
  return result.rows.map(row => ({
    month: row.month,
    count: Number.parseInt(row.count, 10) || 0,
    amount: Number.parseFloat(row.total_amount) || 0
  }));
}

async function getStatusDistributionData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter) {
  const hasUserIdParam = !isSuperAdmin && !isFinance;
  const dateFilter = buildDateFilter(hasUserIdParam ? 1 : 0);
  const roleFilter = buildRoleFilterQuery(isSuperAdmin, isFinance, isManager, isHR, userId);
  
  let query = `
    SELECT 
      CASE 
        WHEN ri.status IN ('paid') THEN 'Paid'
        WHEN ri.status IN ('approved_by_finance') THEN 'Approved by Finance'
        WHEN ri.status IN ('approved_by_hr') THEN 'Approved by HR'
        WHEN ri.status IN ('approved_by_manager') THEN 'Approved by Manager'
        WHEN ri.status IN ('rejected_by_finance', 'rejected_by_hr', 'rejected_by_manager') THEN 'Rejected'
        WHEN ri.status IN ('pending') THEN 'Pending'
        ELSE 'Other'
      END as status,
      COUNT(*) as count,
      COALESCE(SUM(ri.amount), 0) as total_amount
    FROM reimbursement_items ri
    INNER JOIN reimbursements r ON r.id = ri.reimbursement_id
    WHERE 1=1
    ${roleFilter.query}
    ${dateFilter.filter}
    GROUP BY 
      CASE 
        WHEN ri.status IN ('paid') THEN 'Paid'
        WHEN ri.status IN ('approved_by_finance') THEN 'Approved by Finance'
        WHEN ri.status IN ('approved_by_hr') THEN 'Approved by HR'
        WHEN ri.status IN ('approved_by_manager') THEN 'Approved by Manager'
        WHEN ri.status IN ('rejected_by_finance', 'rejected_by_hr', 'rejected_by_manager') THEN 'Rejected'
        WHEN ri.status IN ('pending') THEN 'Pending'
        ELSE 'Other'
      END
    ORDER BY count DESC
  `;
  
  const params = hasUserIdParam ? [userId, ...roleFilter.params, ...dateFilter.params] : [...roleFilter.params, ...dateFilter.params];
  const result = await pool.query(query, params).catch(() => ({ rows: [] }));
  
  return result.rows.map(row => ({
    name: row.status,
    value: Number.parseInt(row.count, 10) || 0,
    amount: Number.parseFloat(row.total_amount) || 0
  }));
}

async function getDepartmentWiseData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter) {
  const hasUserIdParam = !isSuperAdmin && !isFinance;
  const dateFilter = buildDateFilter(hasUserIdParam ? 1 : 0);
  const roleFilter = buildRoleFilterQuery(isSuperAdmin, isFinance, isManager, isHR, userId);
  
  let query = `
    SELECT 
      COALESCE(d.name, 'N/A') as department,
      COUNT(DISTINCT r.id) as count,
      COALESCE(SUM(ri.amount), 0) as total_amount
    FROM reimbursements r
    LEFT JOIN reimbursement_items ri ON ri.reimbursement_id = r.id
    LEFT JOIN departments d ON d.id = r.department_id
    WHERE 1=1
    ${roleFilter.query}
    ${dateFilter.filter}
    GROUP BY d.name 
    ORDER BY total_amount DESC 
    LIMIT 10
  `;
  
  const params = hasUserIdParam ? [userId, ...roleFilter.params, ...dateFilter.params] : [...roleFilter.params, ...dateFilter.params];
  const result = await pool.query(query, params).catch(() => ({ rows: [] }));
  
  return result.rows.map(row => ({
    department: row.department,
    count: Number.parseInt(row.count, 10) || 0,
    amount: Number.parseFloat(row.total_amount) || 0
  }));
}

async function getAmountTrendData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter) {
  const hasUserIdParam = !isSuperAdmin && !isFinance;
  const dateFilter = buildDateFilter(hasUserIdParam ? 1 : 0);
  const roleFilter = buildRoleFilterQuery(isSuperAdmin, isFinance, isManager, isHR, userId);
  
  let query = `
    SELECT 
      TO_CHAR(DATE_TRUNC('week', r.created_at), 'Mon DD') as week,
      COALESCE(SUM(ri.amount), 0) as total_amount,
      COALESCE(SUM(COALESCE(ri.paid_amount, 0)), 0) as paid_amount
    FROM reimbursements r
    LEFT JOIN reimbursement_items ri ON ri.reimbursement_id = r.id
    WHERE r.created_at >= NOW() - INTERVAL '8 weeks'
    ${roleFilter.query}
    ${dateFilter.filter}
    GROUP BY DATE_TRUNC('week', r.created_at) 
    ORDER BY DATE_TRUNC('week', r.created_at)
  `;
  
  const params = hasUserIdParam ? [userId, ...roleFilter.params, ...dateFilter.params] : [...roleFilter.params, ...dateFilter.params];
  const result = await pool.query(query, params).catch(() => ({ rows: [] }));
  
  return result.rows.map(row => ({
    week: row.week,
    total: Number.parseFloat(row.total_amount) || 0,
    paid: Number.parseFloat(row.paid_amount) || 0
  }));
}

async function getWeeklyTrendData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter) {
  const hasUserIdParam = !isSuperAdmin && !isFinance;
  const dateFilter = buildDateFilter(hasUserIdParam ? 1 : 0);
  const roleFilter = buildRoleFilterQuery(isSuperAdmin, isFinance, isManager, isHR, userId);
  
  let query = `
    SELECT 
      TO_CHAR(DATE_TRUNC('day', r.created_at), 'Dy') as day,
      TO_CHAR(DATE_TRUNC('day', r.created_at), 'DD') as date,
      COUNT(DISTINCT r.id) as count,
      COALESCE(SUM(ri.amount), 0) as total_amount
    FROM reimbursements r
    LEFT JOIN reimbursement_items ri ON ri.reimbursement_id = r.id
    WHERE r.created_at >= NOW() - INTERVAL '7 days'
    ${roleFilter.query}
    ${dateFilter.filter}
    GROUP BY DATE_TRUNC('day', r.created_at) 
    ORDER BY DATE_TRUNC('day', r.created_at)
  `;
  
  const params = hasUserIdParam ? [userId, ...roleFilter.params, ...dateFilter.params] : [...roleFilter.params, ...dateFilter.params];
  const result = await pool.query(query, params).catch(() => ({ rows: [] }));
  
  return result.rows.map(row => ({
    day: row.day,
    date: row.date,
    count: Number.parseInt(row.count, 10) || 0,
    amount: Number.parseFloat(row.total_amount) || 0
  }));
}

async function getDailyData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter) {
  const hasUserIdParam = !isSuperAdmin && !isFinance;
  const dateFilter = buildDateFilter(hasUserIdParam ? 1 : 0);
  const roleFilter = buildRoleFilterQuery(isSuperAdmin, isFinance, isManager, isHR, userId);
  
  let query = `
    SELECT 
      TO_CHAR(DATE_TRUNC('day', r.created_at), 'DD') as day,
      COUNT(DISTINCT r.id) as count,
      COALESCE(SUM(ri.amount), 0) as total_amount,
      COALESCE(SUM(CASE WHEN ri.status IN ('paid', 'approved_by_finance') THEN ri.amount ELSE 0 END), 0) as approved_amount,
      COALESCE(SUM(CASE WHEN ri.status IN ('rejected_by_finance', 'rejected_by_hr', 'rejected_by_manager') THEN ri.amount ELSE 0 END), 0) as rejected_amount
    FROM reimbursements r
    LEFT JOIN reimbursement_items ri ON ri.reimbursement_id = r.id
    WHERE r.created_at >= NOW() - INTERVAL '15 days'
    ${roleFilter.query}
    ${dateFilter.filter}
    GROUP BY DATE_TRUNC('day', r.created_at) 
    ORDER BY DATE_TRUNC('day', r.created_at)
  `;
  
  const params = hasUserIdParam ? [userId, ...roleFilter.params, ...dateFilter.params] : [...roleFilter.params, ...dateFilter.params];
  const result = await pool.query(query, params).catch(() => ({ rows: [] }));
  
  return result.rows.map(row => ({
    day: row.day,
    count: Number.parseInt(row.count, 10) || 0,
    total: Number.parseFloat(row.total_amount) || 0,
    approved: Number.parseFloat(row.approved_amount) || 0,
    rejected: Number.parseFloat(row.rejected_amount) || 0
  }));
}

async function getCategoryWiseData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter) {
  const hasUserIdParam = !isSuperAdmin && !isFinance;
  const dateFilter = buildDateFilter(hasUserIdParam ? 1 : 0);
  const roleFilter = buildRoleFilterQuery(isSuperAdmin, isFinance, isManager, isHR, userId);
  
  let query = `
    SELECT 
      COALESCE(ec.name, 'Other') as category,
      COUNT(*) as count,
      COALESCE(SUM(ri.amount), 0) as total_amount
    FROM reimbursement_items ri
    INNER JOIN reimbursements r ON r.id = ri.reimbursement_id
    LEFT JOIN expense_categories ec ON ec.id = ri.expense_category_id
    WHERE 1=1
    ${roleFilter.query}
    ${dateFilter.filter}
    GROUP BY ec.name 
    ORDER BY total_amount DESC 
    LIMIT 6
  `;
  
  const params = hasUserIdParam ? [userId, ...roleFilter.params, ...dateFilter.params] : [...roleFilter.params, ...dateFilter.params];
  const result = await pool.query(query, params).catch(() => ({ rows: [] }));
  
  return result.rows.map(row => ({
    category: row.category,
    count: Number.parseInt(row.count, 10) || 0,
    amount: Number.parseFloat(row.total_amount) || 0
  }));
}

module.exports = {
  getUserStats,
  getPendingApprovalsStats,
  getApprovedStats,
  getRejectedStats,
  getMonthlyTrendData,
  getStatusDistributionData,
  getDepartmentWiseData,
  getAmountTrendData,
  getWeeklyTrendData,
  getDailyData,
  getCategoryWiseData
};

