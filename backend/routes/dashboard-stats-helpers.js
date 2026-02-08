// Helper functions to reduce cognitive complexity in dashboard.js /stats route
const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function buildUserCards(stats, roleInfo, userStats) {
  const { isSuperAdmin, userRole, isManager } = roleInfo;
  const { myApprovedCount, myApprovedAmount, myRejectedCount, myRejectedAmount, myTotalAmount } = userStats;
  
  if (isSuperAdmin || userRole === 'employee' || isManager) {
    if (myApprovedCount > 0 || myApprovedAmount > 0) {
      stats.cards.push({
        title: 'Approval',
        value: myApprovedCount.toString(),
        subtitle: `Amount: $${myApprovedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: 'FiCheckCircle',
        show: true
      });
    }

    if (myRejectedCount > 0 || myRejectedAmount > 0) {
      stats.cards.push({
        title: 'Rejected',
        value: myRejectedCount.toString(),
        subtitle: `Amount: $${myRejectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        icon: 'FiXCircle',
        show: true
      });
    }

    if (myTotalAmount > 0) {
      stats.cards.push({
        title: 'My Total',
        value: `$${myTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        subtitle: 'Total Reimbursements',
        icon: 'FiDollarSign',
        show: true
      });
    }
  }
}

async function buildSuperAdminCards(stats, totalUsers, totalDepartments, totalCostCenters, totalProjects) {
  stats.cards.push(
    {
      title: 'Total Users',
      value: totalUsers.toString(),
      subtitle: '',
      icon: 'FiUsers',
      show: true
    },
    {
      title: 'Departments',
      value: totalDepartments.toString(),
      subtitle: '',
      icon: 'FiBriefcase',
      show: true
    },
    {
      title: 'Cost Centers',
      value: totalCostCenters.toString(),
      subtitle: '',
      icon: 'FiDollarSign',
      show: true
    },
    {
      title: 'Projects',
      value: totalProjects.toString(),
      subtitle: '',
      icon: 'FiFolder',
      show: true
    }
  );
}

async function buildHRCards(stats, isHR, totalDepartments, totalProjects) {
  if (isHR) {
    stats.cards.push(
      {
        title: 'Departments',
        value: totalDepartments.toString(),
        subtitle: '',
        icon: 'FiBriefcase',
        show: true
      },
      {
        title: 'Projects',
        value: totalProjects.toString(),
        subtitle: '',
        icon: 'FiFolder',
        show: true
      }
    );
  }
}

function formatReimbursementRow(row) {
  const displayAmount = Number.parseFloat(row.display_amount || row.total_amount || 0);
  const departmentName = (row.department_name && String(row.department_name).trim() !== '') ? String(row.department_name).trim() : null;
  const costCenterName = (row.cost_center_name && String(row.cost_center_name).trim() !== '') ? String(row.cost_center_name).trim() : null;
  const projectName = (row.project_name && String(row.project_name).trim() !== '') ? String(row.project_name).trim() : null;
  
  return {
    id: row.id,
    name: row.user_name || 'Unknown',
    date: new Date(row.created_at || row.request_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: row.status || 'pending',
    amount: `$${displayAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    userName: row.user_name || 'Unknown',
    department_name: departmentName,
    cost_center_name: costCenterName,
    project_name: projectName
  };
}

function formatPendingApprovalRow(row) {
  const departmentName = (row.department_name && String(row.department_name).trim() !== '') ? String(row.department_name).trim() : null;
  const costCenterName = (row.cost_center_name && String(row.cost_center_name).trim() !== '') ? String(row.cost_center_name).trim() : null;
  const projectName = (row.project_name && String(row.project_name).trim() !== '') ? String(row.project_name).trim() : null;
  
  return {
    id: row.id,
    name: row.user_name || 'Unknown',
    date: new Date(row.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    status: row.status || 'pending',
    amount: `$${Number.parseFloat(row.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    department_name: departmentName,
    cost_center_name: costCenterName,
    project_name: projectName
  };
}

async function fetchRecentReimbursements(pool, userId, isSuperAdmin, isHR, buildDateFilter) {
  const dateFilter = buildDateFilter(isSuperAdmin || isHR ? 0 : 1);
  const query = isSuperAdmin || isHR
    ? `SELECT r.*, u.display_name as user_name, 
       d.name as department_name,
       cc.name as cost_center_name,
       p.name as project_name,
       COALESCE(
         (SELECT SUM(COALESCE(ri.paid_amount, ri.amount)) 
          FROM reimbursement_items ri 
          WHERE ri.reimbursement_id = r.id AND ri.status = 'paid'), 
         COALESCE(r.total_amount, 
           (SELECT COALESCE(SUM(ri.amount), 0) 
            FROM reimbursement_items ri 
            WHERE ri.reimbursement_id = r.id)
         )
       ) as display_amount
       FROM reimbursements r 
       LEFT JOIN users u ON r.user_id = u.id 
       LEFT JOIN departments d ON r.department_id = d.id
       LEFT JOIN cost_centers cc ON r.cost_center_id = cc.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE 1=1${dateFilter.filter}
       ORDER BY r.created_at DESC LIMIT 5`
    : `SELECT r.*, u.display_name as user_name,
       d.name as department_name,
       cc.name as cost_center_name,
       p.name as project_name,
       COALESCE(
         (SELECT SUM(COALESCE(ri.paid_amount, ri.amount)) 
          FROM reimbursement_items ri 
          WHERE ri.reimbursement_id = r.id AND ri.status = 'paid'), 
         COALESCE(r.total_amount,
           (SELECT COALESCE(SUM(ri.amount), 0) 
            FROM reimbursement_items ri 
            WHERE ri.reimbursement_id = r.id)
         )
       ) as display_amount
       FROM reimbursements r 
       LEFT JOIN users u ON r.user_id = u.id 
       LEFT JOIN departments d ON r.department_id = d.id
       LEFT JOIN cost_centers cc ON r.cost_center_id = cc.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.user_id = $1${dateFilter.filter}
       ORDER BY r.created_at DESC LIMIT 5`;

  const params = isSuperAdmin || isHR ? dateFilter.params : [userId, ...dateFilter.params];
  const result = await pool.query(query, params)
    .catch((error) => {
      logger.error('Error fetching recent reimbursements', error);
      return { rows: [] };
    });

  return result.rows.map(formatReimbursementRow);
}

async function fetchPendingApprovals(pool, userId, isSuperAdmin, isManager, isHR, isFinance, buildDateFilter) {
  const dateFilter = buildDateFilter(isSuperAdmin || isManager || isHR || isFinance ? 0 : 1);
  const query = isSuperAdmin || isManager || isHR || isFinance
    ? `SELECT r.*, u.display_name as user_name,
       d.name as department_name,
       cc.name as cost_center_name,
       p.name as project_name
       FROM reimbursements r 
       LEFT JOIN users u ON r.user_id = u.id 
       LEFT JOIN departments d ON r.department_id = d.id
       LEFT JOIN cost_centers cc ON r.cost_center_id = cc.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.status IN ('submitted', 'pending', 'pending approval', 'partially_approved')${dateFilter.filter}
       ORDER BY r.created_at DESC LIMIT 5`
    : `SELECT r.*, u.display_name as user_name,
       d.name as department_name,
       cc.name as cost_center_name,
       p.name as project_name
       FROM reimbursements r 
       LEFT JOIN users u ON r.user_id = u.id 
       LEFT JOIN departments d ON r.department_id = d.id
       LEFT JOIN cost_centers cc ON r.cost_center_id = cc.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.user_id = $1 AND r.status IN ('submitted', 'pending', 'pending approval', 'partially_approved')${dateFilter.filter}
       ORDER BY r.created_at DESC LIMIT 5`;

  const params = isSuperAdmin || isManager || isHR || isFinance ? dateFilter.params : [userId, ...dateFilter.params];
  const result = await pool.query(query, params)
    .catch((error) => {
      logger.error('Error fetching pending approvals', error);
      return { rows: [] };
    });

  return result.rows.map(formatPendingApprovalRow);
}

module.exports = {
  buildUserCards,
  buildSuperAdminCards,
  buildHRCards,
  fetchRecentReimbursements,
  fetchPendingApprovals
};

