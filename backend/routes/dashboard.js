const express = require('express');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const {
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
} = require('./dashboard-helpers');
const {
  buildUserCards,
  buildSuperAdminCards,
  buildHRCards,
  fetchRecentReimbursements,
  fetchPendingApprovals
} = require('./dashboard-stats-helpers');
const router = express.Router();

// Shared date filter builder function
function buildDateFilterShared(startDate, endDate, paramOffset = 0) {
  let filter = '';
  const params = [];
  let paramIndex = paramOffset;
  
  if (startDate) {
    paramIndex++;
    filter += ` AND r.created_at >= $${paramIndex}`;
    params.push(String(startDate));
  }
  if (endDate) {
    paramIndex++;
    const endDateTime = new Date(String(endDate));
    endDateTime.setHours(23, 59, 59, 999);
    filter += ` AND r.created_at <= $${paramIndex}`;
    params.push(endDateTime.toISOString());
  }
  
  return { filter, params };
}

const { isAuthenticated } = require('../middleware/auth');

router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role?.name || 'employee';
    const isSuperAdmin = userRole === 'superadmin';
    const isFinance = userRole === 'finance';
    const isHR = userRole === 'hr';
    const isManager = userRole === 'manager';

    // Get date range from query parameters
    const startDateRaw = req.query.startDate;
    const endDateRaw = req.query.endDate;
    const startDate = (startDateRaw === null || startDateRaw === undefined || typeof startDateRaw !== 'string') ? null : String(startDateRaw);
    const endDate = (endDateRaw === null || endDateRaw === undefined || typeof endDateRaw !== 'string') ? null : String(endDateRaw);
    
    // Build date filter clause and parameters
    const buildDateFilter = (paramOffset = 0) => buildDateFilterShared(startDate, endDate, paramOffset);

    const startDateStr = startDate || 'none';
    const endDateStr = endDate || 'none';
    logger.info(`Dashboard stats requested for user: ${userId}, Role: ${userRole}, Date Range: ${startDateStr} to ${endDateStr}`);

    const stats = {
      cards: [],
      activity: {
        reimbursements: 0,
        pending: 0,
        approved: 0
      },
      recentReimbursements: [],
      pendingApprovals: []
    };

    // Fetch all counts in parallel
    const { fetchTotalCounts, buildApprovalCards, calculateActivityStats } = require('./dashboard-stats-query-helpers');
    const counts = await fetchTotalCounts();
    const { totalUsers, totalReimbursements, pendingReimbursements, approvedReimbursements, totalDepartments, totalCostCenters, totalProjects } = counts;

    // Get user stats using helper function
    const userStats = await getUserStats(userId, buildDateFilter);
    const { myApprovedCount, myApprovedAmount, myRejectedCount, myRejectedAmount, myTotalAmount } = userStats;

    // Build user cards
    await buildUserCards(stats, { isSuperAdmin, userRole, isManager }, { myApprovedCount, myApprovedAmount, myRejectedCount, myRejectedAmount, myTotalAmount });
    
    // Build superadmin cards
    if (isSuperAdmin) {
      await buildSuperAdminCards(stats, totalUsers, totalDepartments, totalCostCenters, totalProjects);
    }

    // Build HR cards
    if (isSuperAdmin || isHR) {
      await buildHRCards(stats, isHR, totalDepartments, totalProjects);
    }

    // Build approval cards
    await buildApprovalCards({
      stats,
      userId,
      roleInfo: { isSuperAdmin, isFinance, isHR, isManager },
      buildDateFilter,
      getPendingApprovalsStats,
      getApprovedStats,
      getRejectedStats
    });

    // Calculate activity stats
    stats.activity = calculateActivityStats(totalReimbursements, pendingReimbursements, approvedReimbursements);

    // Fetch recent data
    stats.recentReimbursements = await fetchRecentReimbursements(pool, userId, isSuperAdmin, isHR, buildDateFilter);
    stats.pendingApprovals = await fetchPendingApprovals(pool, userId, isSuperAdmin, isManager, isHR, isFinance, buildDateFilter);

    logger.info(`Dashboard stats prepared. Cards count: ${stats.cards.length}`);
    logger.info(`Cards: ${stats.cards.map(c => c.title).join(', ')}`);

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching dashboard stats', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard statistics' });
  }
});

// Get chart data for dashboard
router.get('/charts', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role?.name || 'employee';
    const isSuperAdmin = userRole === 'superadmin';
    const isFinance = userRole === 'finance';
    const isHR = userRole === 'hr';
    const isManager = userRole === 'manager';

    // Get date range from query parameters
    const startDateRaw = req.query.startDate;
    const endDateRaw = req.query.endDate;
    const startDate = (startDateRaw === null || startDateRaw === undefined || typeof startDateRaw !== 'string') ? null : String(startDateRaw);
    const endDate = (endDateRaw === null || endDateRaw === undefined || typeof endDateRaw !== 'string') ? null : String(endDateRaw);

    // Build date filter clause
    const buildDateFilter = (paramOffset = 0) => buildDateFilterShared(startDate, endDate, paramOffset);

    const chartData = {
      monthlyTrend: await getMonthlyTrendData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter),
      statusDistribution: await getStatusDistributionData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter),
      departmentWise: await getDepartmentWiseData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter),
      amountTrend: await getAmountTrendData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter),
      weeklyTrend: await getWeeklyTrendData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter),
      dailyData: await getDailyData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter),
      categoryWise: await getCategoryWiseData(pool, userId, isSuperAdmin, isFinance, isManager, isHR, buildDateFilter)
    };

    res.json({ success: true, data: chartData });
  } catch (error) {
    logger.error('Error fetching chart data', error);
    res.status(500).json({ success: false, message: 'Failed to fetch chart data' });
  }
});

module.exports = router;
