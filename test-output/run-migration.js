const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    const sql = fs.readFileSync('./migrations/001-init.sql', 'utf-8');
    console.log('[INFO] Running migration...');
    await pool.query(sql);
    console.log('[INFO] Migration complete');
  } catch (err) {
    console.error('[ERROR] Migration failed', err);
  } finally {
    await pool.end();
  }
}

migrate();
