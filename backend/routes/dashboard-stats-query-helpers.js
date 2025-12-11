// Helper functions to extract query logic from dashboard.js /stats route
const { pool } = require('../config/database');

async function fetchTotalCounts() {
  const [totalUsersResult, totalReimbursementsResult, pendingReimbursementsResult, approvedReimbursementsResult, departmentsResult, costCentersResult, projectsResult] = await Promise.all([
    pool.query('SELECT COUNT(*) as count FROM users').catch(() => ({ rows: [{ count: '0' }] })),
    pool.query('SELECT COUNT(*) as count FROM reimbursements').catch(() => ({ rows: [{ count: '0' }] })),
    pool.query(`SELECT COUNT(*) as count FROM reimbursements WHERE status IN ('submitted', 'pending', 'pending approval', 'partially_approved')`).catch(() => ({ rows: [{ count: '0' }] })),
    pool.query(`SELECT COUNT(*) as count FROM reimbursements WHERE status IN ('approved', 'paid', 'partially_approved')`).catch(() => ({ rows: [{ count: '0' }] })),
    pool.query('SELECT COUNT(*) as count FROM departments').catch(() => ({ rows: [{ count: '0' }] })),
    pool.query('SELECT COUNT(*) as count FROM cost_centers').catch(() => ({ rows: [{ count: '0' }] })),
    pool.query('SELECT COUNT(*) as count FROM projects').catch(() => ({ rows: [{ count: '0' }] }))
  ]);

  return {
    totalUsers: Number.parseInt(totalUsersResult.rows[0].count, 10) || 0,
    totalReimbursements: Number.parseInt(totalReimbursementsResult.rows[0]?.count, 10) || 0,
    pendingReimbursements: Number.parseInt(pendingReimbursementsResult.rows[0]?.count, 10) || 0,
    approvedReimbursements: Number.parseInt(approvedReimbursementsResult.rows[0]?.count, 10) || 0,
    totalDepartments: Number.parseInt(departmentsResult.rows[0]?.count, 10) || 0,
    totalCostCenters: Number.parseInt(costCentersResult.rows[0]?.count, 10) || 0,
    totalProjects: Number.parseInt(projectsResult.rows[0]?.count, 10) || 0
  };
}

async function buildApprovalCards(config) {
  const { stats, userId, roleInfo, buildDateFilter, getPendingApprovalsStats, getApprovedStats, getRejectedStats } = config;
  const { isSuperAdmin, isFinance, isHR, isManager } = roleInfo;
  
  if (!isSuperAdmin && !isManager && !isHR && !isFinance) {
    return;
  }

  const { pendingApprovalsCount, pendingApprovalsAmount } = await getPendingApprovalsStats(
    userId, isSuperAdmin, isFinance, isHR, isManager, buildDateFilter
  );

  stats.cards.push({
    title: 'Pending Approvals',
    value: pendingApprovalsCount.toString(),
    subtitle: `Amount: $${pendingApprovalsAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    icon: 'FiCheckCircle',
    show: true
  });

  const { approvedCount, approvedAmount } = await getApprovedStats(isSuperAdmin, isFinance, isHR, isManager);

  if (approvedCount > 0 || isSuperAdmin || isFinance || isHR || isManager) {
    stats.cards.push({
      title: 'Approved',
      value: approvedCount.toString(),
      subtitle: `Amount: $${approvedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'FiCheckCircle',
      show: true
    });
  }

  const { rejectedCount, rejectedAmount } = await getRejectedStats(userId, isSuperAdmin, isFinance, isHR, isManager);

  if (isSuperAdmin || isFinance || isHR || isManager) {
    stats.cards.push({
      title: 'Rejected',
      value: rejectedCount.toString(),
      subtitle: `Amount: $${rejectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: 'FiXCircle',
      show: true
    });
  }
}

function calculateActivityStats(totalReimbursements, pendingReimbursements, approvedReimbursements) {
  const totalActivity = totalReimbursements || 1;
  return {
    reimbursements: Math.round((totalReimbursements / totalActivity) * 100),
    pending: Math.round((pendingReimbursements / totalActivity) * 100),
    approved: Math.round((approvedReimbursements / totalActivity) * 100)
  };
}

module.exports = {
  fetchTotalCounts,
  buildApprovalCards,
  calculateActivityStats
};

