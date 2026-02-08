const express = require('express');
const { pool } = require('../config/database');
const upload = require('../middleware/upload');
const path = require('node:path');
const logger = require('../utils/logger');
const { isAuthenticated } = require('../middleware/auth');
const {
  organizeItemFiles,
  processReimbursementItem,
  fetchReimbursementWithDetails
} = require('./reimbursements-helpers');
const { handleSimpleGetRequest } = require('./reimbursements-get-helpers');
const router = express.Router();

router.get('/departments', isAuthenticated, async (req, res) => {
  await handleSimpleGetRequest(req, res, `
    SELECT id, name, code, description, status 
    FROM departments 
    WHERE status = 'active'
    ORDER BY name ASC
  `);
});

router.get('/cost-centers', isAuthenticated, async (req, res) => {
  const { department_id } = req.query;
  let query = `
    SELECT cc.id, cc.name, cc.code, cc.description, cc.status, d.name as department_name
    FROM cost_centers cc
    LEFT JOIN departments d ON cc.department_id = d.id
    WHERE cc.status = 'active'
  `;
  const params = [];

  if (department_id) {
    query += ' AND cc.department_id = $1';
    params.push(department_id);
  }

  query += ' ORDER BY cc.name ASC';
  await handleSimpleGetRequest(req, res, query, params);
});

router.get('/projects', isAuthenticated, async (req, res) => {
  await handleSimpleGetRequest(req, res, `
    SELECT id, name, code, description, start_date, end_date, status 
    FROM projects 
    WHERE status = 'active'
    ORDER BY name ASC
  `);
});

router.get('/expense-categories', isAuthenticated, async (req, res) => {
  await handleSimpleGetRequest(req, res, `
    SELECT id, name, code, description 
    FROM expense_categories 
    ORDER BY name ASC
  `);
});

router.post('/', isAuthenticated, upload.any(), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userId = req.user.id;
    const { parseRequestData, validateItems, calculateTotalAmount, determineReimbursementStatus } = require('./reimbursements-validation-helpers');

    const requestData = parseRequestData(req);
    const { department_id, cost_center_id, project_id, description, items, status = 'draft' } = requestData;

    const itemsValidation = validateItems(items);
    if (!itemsValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: itemsValidation.error });
    }

    const amountCalculation = calculateTotalAmount(items);
    if (!amountCalculation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: amountCalculation.error });
    }
    const totalAmount = amountCalculation.totalAmount;

    const reimbursementStatus = determineReimbursementStatus(status);

    const reimbursementResult = await client.query(`
      INSERT INTO reimbursements (user_id, department_id, cost_center_id, project_id, description, total_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [userId, department_id || null, cost_center_id || null, project_id || null, description || null, totalAmount, reimbursementStatus]);

    const reimbursementId = reimbursementResult.rows[0].id;

    // Organize files by item index
    const itemFilesMap = organizeItemFiles(req.files);

    // Process all items
    const { processAllItems, recalculateAndUpdateTotal } = require('./reimbursements-process-helpers');
    const processResult = await processAllItems(client, reimbursementId, items, itemFilesMap, userId, organizeItemFiles, processReimbursementItem);
    if (!processResult.success) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: processResult.error });
    }

    // Recalculate and update total if needed
    await recalculateAndUpdateTotal(client, reimbursementId, totalAmount);

    await client.query('COMMIT');

    // Fetch reimbursement with all details
    const reimbursementData = await fetchReimbursementWithDetails(pool, reimbursementId);

    res.json({
      success: true,
      data: {
        ...reimbursementData.reimbursement || reimbursementResult.rows[0],
        items: reimbursementData.items,
        attachments: reimbursementData.attachments
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '42P01') {
      return res.status(503).json({ success: false, message: 'Database tables not initialized. Please restart the server.' });
    }
    logger.error('Error creating reimbursement', error);
    res.status(500).json({ success: false, message: 'Failed to create reimbursement', error: error.message });
  } finally {
    client.release();
  }
});

router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role?.name || 'employee';

    let query = `
      SELECT r.*, 
        d.name as department_name,
        cc.name as cost_center_name,
        p.name as project_name,
        u.display_name as user_name
      FROM reimbursements r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN cost_centers cc ON r.cost_center_id = cc.id
      LEFT JOIN projects p ON r.project_id = p.id
      LEFT JOIN users u ON r.user_id = u.id
    `;

    const params = [];

    if (userRole !== 'superadmin' && userRole !== 'hr') {
      query += ' WHERE r.user_id = $1';
      params.push(userId);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);

    const reimbursements = await Promise.all(result.rows.map(async (reimbursement) => {
      try {
        const itemsResult = await pool.query(`
          SELECT ri.*, ec.name as expense_category_name,
                 COALESCE(ri.paid_amount, ri.amount) as display_amount
          FROM reimbursement_items ri
          LEFT JOIN expense_categories ec ON ri.expense_category_id = ec.id
          WHERE ri.reimbursement_id = $1
        `, [reimbursement.id]);

        return {
          ...reimbursement,
          items: itemsResult.rows || []
        };
      } catch (itemError) {
        logger.warn('Error fetching reimbursement items:', itemError.message);
        return {
          ...reimbursement,
          items: []
        };
      }
    }));

    res.json({ success: true, data: reimbursements || [] });
  } catch (error) {
    if (error.code === '42P01') {
      res.json({ success: true, data: [] });
      return;
    }
    logger.error('Error fetching reimbursements', error);
    res.json({ success: true, data: [] });
  }
});

module.exports = router;

