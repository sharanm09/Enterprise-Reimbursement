const { pool } = require('../config/database');

async function checkStatuses() {
  try {
    const result = await pool.query(`
      SELECT ri.id, ri.status, ri.amount, r.status as reimbursement_status, r.total_amount
      FROM reimbursement_items ri
      INNER JOIN reimbursements r ON ri.reimbursement_id = r.id
      ORDER BY ri.created_at DESC
    `);
    
    console.log('Reimbursement Items Status:');
    result.rows.forEach(row => {
      console.log(`Item Status: ${row.status} | Amount: $${row.amount} | Reimbursement Status: ${row.reimbursement_status} | Total: $${row.total_amount}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkStatuses();

