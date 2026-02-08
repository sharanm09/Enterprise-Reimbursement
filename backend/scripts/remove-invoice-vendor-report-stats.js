const { pool } = require('../config/database');

async function removeStatsCards() {
  try {
    const result = await pool.query(`
      UPDATE dashboard_stats 
      SET is_active = false 
      WHERE title IN ('Vendors', 'Invoices', 'Reports', 'Analytics', 'Reports & Analytics')
    `);
    console.log(`Deactivated ${result.rowCount} dashboard stats cards`);
    
    // Also delete them if you want to completely remove
    const deleteResult = await pool.query(`
      DELETE FROM dashboard_stats 
      WHERE title IN ('Vendors', 'Invoices', 'Reports', 'Analytics', 'Reports & Analytics')
    `);
    console.log(`Deleted ${deleteResult.rowCount} dashboard stats cards`);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error removing stats cards:', error);
    await pool.end();
    process.exit(1);
  }
}

removeStatsCards();

