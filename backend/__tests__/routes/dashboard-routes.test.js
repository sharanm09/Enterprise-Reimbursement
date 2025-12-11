const request = require('supertest');
const express = require('express');
const dashboardRouter = require('../../routes/dashboard');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../routes/dashboard-helpers', () => ({
  getUserStats: jest.fn(),
  getPendingApprovalsStats: jest.fn(),
  getApprovedStats: jest.fn(),
  getRejectedStats: jest.fn(),
  getMonthlyTrendData: jest.fn(),
  getStatusDistributionData: jest.fn(),
  getDepartmentWiseData: jest.fn(),
  getAmountTrendData: jest.fn(),
  getWeeklyTrendData: jest.fn(),
  getDailyData: jest.fn(),
  getCategoryWiseData: jest.fn()
}));

jest.mock('../../routes/dashboard-stats-helpers', () => ({
  buildUserCards: jest.fn(),
  buildSuperAdminCards: jest.fn(),
  buildHRCards: jest.fn(),
  fetchRecentReimbursements: jest.fn(),
  fetchPendingApprovals: jest.fn()
}));

jest.mock('../../routes/dashboard-stats-query-helpers', () => ({
  fetchTotalCounts: jest.fn(),
  buildApprovalCards: jest.fn(),
  calculateActivityStats: jest.fn()
}));

describe('Dashboard Routes', () => {
  let app;
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
  } = require('../../routes/dashboard-helpers');
  const {
    buildUserCards,
    buildSuperAdminCards,
    buildHRCards,
    fetchRecentReimbursements,
    fetchPendingApprovals
  } = require('../../routes/dashboard-stats-helpers');
  const {
    fetchTotalCounts,
    buildApprovalCards,
    calculateActivityStats
  } = require('../../routes/dashboard-stats-query-helpers');

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'employee' } };
      next();
    });
    app.use('/api/dashboard', dashboardRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard/stats', () => {
    test('should return dashboard stats for employee', async () => {
      getUserStats.mockResolvedValue({
        myApprovedCount: 5,
        myApprovedAmount: 1000,
        myRejectedCount: 1,
        myRejectedAmount: 200,
        myTotalAmount: 1200
      });
      fetchTotalCounts.mockResolvedValue({
        totalUsers: 10,
        totalReimbursements: 50,
        pendingReimbursements: 5,
        approvedReimbursements: 30,
        totalDepartments: 3,
        totalCostCenters: 5,
        totalProjects: 2
      });
      buildUserCards.mockResolvedValue();
      buildApprovalCards.mockResolvedValue();
      calculateActivityStats.mockReturnValue({
        reimbursements: 100,
        pending: 10,
        approved: 60
      });
      fetchRecentReimbursements.mockResolvedValue([]);
      fetchPendingApprovals.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should return dashboard stats for superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      getUserStats.mockResolvedValue({
        myApprovedCount: 0,
        myApprovedAmount: 0,
        myRejectedCount: 0,
        myRejectedAmount: 0,
        myTotalAmount: 0
      });
      fetchTotalCounts.mockResolvedValue({
        totalUsers: 10,
        totalReimbursements: 50,
        pendingReimbursements: 5,
        approvedReimbursements: 30,
        totalDepartments: 3,
        totalCostCenters: 5,
        totalProjects: 2
      });
      buildUserCards.mockResolvedValue();
      buildSuperAdminCards.mockResolvedValue();
      buildHRCards.mockResolvedValue();
      buildApprovalCards.mockResolvedValue();
      calculateActivityStats.mockReturnValue({
        reimbursements: 100,
        pending: 10,
        approved: 60
      });
      fetchRecentReimbursements.mockResolvedValue([]);
      fetchPendingApprovals.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle date range filters', async () => {
      getUserStats.mockResolvedValue({
        myApprovedCount: 5,
        myApprovedAmount: 1000,
        myRejectedCount: 1,
        myRejectedAmount: 200,
        myTotalAmount: 1200
      });
      fetchTotalCounts.mockResolvedValue({
        totalUsers: 10,
        totalReimbursements: 50,
        pendingReimbursements: 5,
        approvedReimbursements: 30,
        totalDepartments: 3,
        totalCostCenters: 5,
        totalProjects: 2
      });
      buildUserCards.mockResolvedValue();
      buildApprovalCards.mockResolvedValue();
      calculateActivityStats.mockReturnValue({
        reimbursements: 100,
        pending: 10,
        approved: 60
      });
      fetchRecentReimbursements.mockResolvedValue([]);
      fetchPendingApprovals.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/stats?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle errors', async () => {
      getUserStats.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should return 401 when not authenticated', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(false);
        next();
      });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/dashboard/charts', () => {
    test('should return chart data for employee', async () => {
      getMonthlyTrendData.mockResolvedValue([]);
      getStatusDistributionData.mockResolvedValue([]);
      getDepartmentWiseData.mockResolvedValue([]);
      getAmountTrendData.mockResolvedValue([]);
      getWeeklyTrendData.mockResolvedValue([]);
      getDailyData.mockResolvedValue([]);
      getCategoryWiseData.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/charts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('monthlyTrend');
      expect(response.body.data).toHaveProperty('statusDistribution');
    });

    test('should return chart data with date filters', async () => {
      getMonthlyTrendData.mockResolvedValue([]);
      getStatusDistributionData.mockResolvedValue([]);
      getDepartmentWiseData.mockResolvedValue([]);
      getAmountTrendData.mockResolvedValue([]);
      getWeeklyTrendData.mockResolvedValue([]);
      getDailyData.mockResolvedValue([]);
      getCategoryWiseData.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/charts?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle errors', async () => {
      getMonthlyTrendData.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/dashboard/charts')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should return 401 when not authenticated', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(false);
        next();
      });

      const response = await request(app)
        .get('/api/dashboard/charts')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});


