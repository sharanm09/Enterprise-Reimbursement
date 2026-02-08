const express = require('express');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { isAuthenticated } = require('../middleware/auth');
const {
  handleGetRequest,
  handlePostRequest,
  handlePutRequest,
  handleDeleteRequest
} = require('./masterData-crud-helpers');
const router = express.Router();

const isSuperAdminOrHR = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  
  try {
    const User = require('../models/User');
    const userId = req.user?.id || req.user?._id || req.session?.passport?.user;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID not found in session' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    const userRole = user.role?.name || '';
    if (userRole !== 'superadmin' && userRole !== 'hr') {
      return res.status(403).json({ success: false, message: 'Access denied. Super Admin or HR only.' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    logger.error('Error checking permissions:', error);
    return res.status(500).json({ success: false, message: 'Error checking permissions', error: error.message });
  }
};

router.get('/departments', isAuthenticated, async (req, res) => {
  await handleGetRequest(req, res, {
    tableName: 'departments',
    entityName: 'departments',
    selectFields: 'd.*, COUNT(DISTINCT cc.id) as cost_center_count',
    joinClause: 'LEFT JOIN cost_centers cc ON d.id = cc.department_id AND cc.status = \'active\'',
    groupBy: 'GROUP BY d.id',
    orderBy: 'ORDER BY d.name ASC',
    tableAlias: 'd'
  });
});

router.post('/departments', isSuperAdminOrHR, async (req, res) => {
  await handlePostRequest(req, res, {
    tableName: 'departments',
    entityName: 'Department',
    getFields: () => ['name', 'code', 'description', 'status'],
    getValues: (body) => [body.name, body.code, body.description || null, body.status || 'active']
  });
});

router.put('/departments/:id', isSuperAdminOrHR, async (req, res) => {
  await handlePutRequest(req, res, {
    tableName: 'departments',
    entityName: 'Department',
    getFields: () => ['name', 'code', 'description', 'status'],
    getValues: (body) => [body.name, body.code, body.description || null, body.status]
  });
});

router.delete('/departments/:id', isSuperAdminOrHR, async (req, res) => {
  await handleDeleteRequest(req, res, {
    tableName: 'departments',
    entityName: 'Department',
    checkTable: 'cost_centers',
    checkField: 'department_id'
  });
});

router.get('/cost-centers', isAuthenticated, async (req, res) => {
  await handleGetRequest(req, res, {
    tableName: 'cost_centers',
    entityName: 'cost centers',
    selectFields: 'cc.*, d.name as department_name, COUNT(DISTINCT r.id) as reimbursement_count',
    joinClause: 'LEFT JOIN departments d ON cc.department_id = d.id LEFT JOIN reimbursements r ON cc.id = r.cost_center_id',
    groupBy: 'GROUP BY cc.id, d.name',
    orderBy: 'ORDER BY cc.name ASC',
    tableAlias: 'cc',
    additionalFilters: { department_id: req.query.department_id }
  });
});

router.post('/cost-centers', isSuperAdminOrHR, async (req, res) => {
  await handlePostRequest(req, res, {
    tableName: 'cost_centers',
    entityName: 'Cost center',
    getFields: () => ['name', 'code', 'department_id', 'description', 'status'],
    getValues: (body) => [body.name, body.code, body.department_id, body.description || null, body.status || 'active'],
    getAdditionalFields: (body) => ({ department_id: body.department_id }),
    postProcess: async (data, body) => {
      const deptResult = await pool.query('SELECT name FROM departments WHERE id = $1', [body.department_id]);
      data.department_name = deptResult.rows[0]?.name || null;
      return data;
    }
  });
});

router.put('/cost-centers/:id', isSuperAdminOrHR, async (req, res) => {
  await handlePutRequest(req, res, {
    tableName: 'cost_centers',
    entityName: 'Cost center',
    getFields: () => ['name', 'code', 'department_id', 'description', 'status'],
    getValues: (body) => [body.name, body.code, body.department_id, body.description || null, body.status],
    getAdditionalFields: (body) => ({ department_id: body.department_id }),
    postProcess: async (data, body) => {
      const deptResult = await pool.query('SELECT name FROM departments WHERE id = $1', [body.department_id]);
      data.department_name = deptResult.rows[0]?.name || null;
      return data;
    }
  });
});

router.delete('/cost-centers/:id', isSuperAdminOrHR, async (req, res) => {
  await handleDeleteRequest(req, res, {
    tableName: 'cost_centers',
    entityName: 'Cost center',
    checkTable: 'reimbursements',
    checkField: 'cost_center_id'
  });
});

router.get('/projects', isAuthenticated, async (req, res) => {
  await handleGetRequest(req, res, {
    tableName: 'projects',
    entityName: 'projects',
    selectFields: 'p.*, COUNT(DISTINCT r.id) as reimbursement_count, COALESCE(SUM(r.total_amount), 0) as total_expenses',
    joinClause: 'LEFT JOIN reimbursements r ON p.id = r.project_id',
    groupBy: 'GROUP BY p.id',
    orderBy: 'ORDER BY p.name ASC',
    tableAlias: 'p'
  });
});

router.post('/projects', isSuperAdminOrHR, async (req, res) => {
  await handlePostRequest(req, res, {
    tableName: 'projects',
    entityName: 'Project',
    getFields: () => ['name', 'code', 'description', 'start_date', 'end_date', 'status'],
    getValues: (body) => [body.name, body.code, body.description || null, body.start_date || null, body.end_date || null, body.status || 'active']
  });
});

router.put('/projects/:id', isSuperAdminOrHR, async (req, res) => {
  await handlePutRequest(req, res, {
    tableName: 'projects',
    entityName: 'Project',
    getFields: () => ['name', 'code', 'description', 'start_date', 'end_date', 'status'],
    getValues: (body) => [body.name, body.code, body.description || null, body.start_date || null, body.end_date || null, body.status]
  });
});

router.delete('/projects/:id', isSuperAdminOrHR, async (req, res) => {
  await handleDeleteRequest(req, res, {
    tableName: 'projects',
    entityName: 'Project'
  });
});

module.exports = router;

