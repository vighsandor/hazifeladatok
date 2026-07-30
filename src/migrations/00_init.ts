import { query } from '../db/connection';

export async function up() {
  console.log('Running migration: Create customers table...');

  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      telepules VARCHAR(255),
      lat NUMERIC,
      lon NUMERIC,
      budget NUMERIC,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✓ customers table created');
}

export async function down() {
  console.log('Reverting migration: Drop customers table...');
  await query('DROP TABLE IF EXISTS customers;');
  console.log('✓ customers table dropped');
}
