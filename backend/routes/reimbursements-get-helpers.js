// Helper functions for GET endpoints in reimbursements.js to reduce duplication
const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function handleSimpleGetRequest(req, res, query, params = []) {
  try {
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows || [] });
  } catch (error) {
    if (error.code === '42P01') {
      res.json({ success: true, data: [] });
      return;
    }
    logger.error('Error fetching data', error);
    res.json({ success: true, data: [] });
  }
}

module.exports = {
  handleSimpleGetRequest
};


