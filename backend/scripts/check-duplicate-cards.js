const { pool } = require('../config/database');

async function checkDuplicates() {
  try {
    const result = await pool.query(`
      SELECT id, title, role_name, is_active, display_order 
      FROM dashboard_stats 
      WHERE title LIKE '%Pending%' OR title LIKE '%Approved%'
      ORDER BY display_order
    `);
    
    console.log('Cards with Pending/Approved in title:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id} | Title: ${row.title} | Role: ${row.role_name || 'NULL'} | Active: ${row.is_active} | Order: ${row.display_order}`);
    });
    
    const allCards = await pool.query(`
      SELECT title, COUNT(*) as count 
      FROM dashboard_stats 
      GROUP BY title 
      HAVING COUNT(*) > 1
    `);
    
    console.log('\nDuplicate titles:');
    allCards.rows.forEach(row => {
      console.log(`Title: ${row.title} | Count: ${row.count}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDuplicates();

