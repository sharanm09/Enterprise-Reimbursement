const express = require('express');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { isAuthenticated } = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/roleChecks');
const router = express.Router();

router.get('/stats-cards', isAuthenticated, async (req, res) => {
  try {
    const userRole = req.user.role?.name || 'employee';
    const isSuperAdmin = userRole === 'superadmin';
    
    let result;
    if (isSuperAdmin) {
      result = await pool.query(`
        SELECT * FROM dashboard_stats 
        WHERE (role_name = 'superadmin' OR role_name = 'employee' OR role_name = 'manager' OR role_name = 'hr' OR role_name = 'finance' OR role_name IS NULL) 
        AND is_active = true 
        ORDER BY display_order ASC
      `);
    } else {
      result = await pool.query(`
        SELECT * FROM dashboard_stats 
        WHERE (role_name = $1 OR role_name IS NULL) 
        AND is_active = true 
        ORDER BY display_order ASC
      `, [userRole]);
    }

    logger.info(`Dashboard stats cards fetched for role: ${userRole}, isSuperAdmin: ${isSuperAdmin}, count: ${result.rows.length}`);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Error fetching dashboard stats cards:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats cards' });
  }
});

router.get('/stats-cards/all', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM dashboard_stats 
      ORDER BY display_order ASC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Error fetching all dashboard stats cards:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats cards' });
  }
});

router.post('/stats-cards', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { title, value, subtitle, icon, emoji, color, role_name, display_order } = req.body;

    if (!title || !icon) {
      return res.status(400).json({ success: false, message: 'Title and icon are required' });
    }

    const result = await pool.query(`
      INSERT INTO dashboard_stats (title, value, subtitle, icon, emoji, color, role_name, display_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [title, value || '0', subtitle || null, icon, emoji || null, color || null, role_name || null, display_order || 0]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error creating dashboard stats card:', error);
    res.status(500).json({ success: false, message: 'Failed to create dashboard stats card' });
  }
});

router.put('/stats-cards/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, value, subtitle, icon, emoji, color, role_name, display_order, is_active } = req.body;

    const result = await pool.query(`
      UPDATE dashboard_stats 
      SET title = COALESCE($1, title),
          value = COALESCE($2, value),
          subtitle = COALESCE($3, subtitle),
          icon = COALESCE($4, icon),
          emoji = COALESCE($5, emoji),
          color = COALESCE($6, color),
          role_name = COALESCE($7, role_name),
          display_order = COALESCE($8, display_order),
          is_active = COALESCE($9, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
    `, [title, value, subtitle, icon, emoji, color, role_name, display_order, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dashboard stats card not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    logger.error('Error updating dashboard stats card:', error);
    res.status(500).json({ success: false, message: 'Failed to update dashboard stats card' });
  }
});

router.delete('/stats-cards/:id', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM dashboard_stats 
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Dashboard stats card not found' });
    }

    res.json({ success: true, message: 'Dashboard stats card deleted successfully' });
  } catch (error) {
    logger.error('Error deleting dashboard stats card:', error);
    res.status(500).json({ success: false, message: 'Failed to delete dashboard stats card' });
  }
});

module.exports = router;

