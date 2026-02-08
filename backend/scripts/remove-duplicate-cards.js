const { pool } = require('../config/database');

async function removeDuplicates() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const duplicateCards = await client.query(`
      SELECT id FROM dashboard_stats 
      WHERE title = 'Pending Approvals'
      ORDER BY display_order
    `);

    console.log(`Found ${duplicateCards.rows.length} "Pending Approvals" cards`);

    if (duplicateCards.rows.length > 1) {
      const idsToDelete = duplicateCards.rows.slice(1).map(row => row.id);
      
      for (const id of idsToDelete) {
        await client.query('DELETE FROM dashboard_stats WHERE id = $1', [id]);
        console.log(`Deleted card with ID: ${id}`);
      }
      
      console.log(`\n✅ Removed ${idsToDelete.length} duplicate cards`);
      console.log(`✅ Kept 1 "Pending Approvals" card`);
    } else {
      console.log('No duplicates found');
    }

    await client.query('COMMIT');
    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

removeDuplicates();

