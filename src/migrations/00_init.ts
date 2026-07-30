import { query } from '../db/connection';

export async function up() {
  console.log('Running migration: Create customers table...');

  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      telepules VARCHAR(255),
      lat NUMERIC,
      lon NUMERIC,
      budget NUMERIC,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✓ customers table created');

  // Ensure UNIQUE constraint on name (add if not exists)
  try {
    await query(`
      ALTER TABLE customers ADD CONSTRAINT customers_name_unique UNIQUE (name);
    `);
    console.log('✓ UNIQUE constraint added to name column');
  } catch (error: any) {
    if (error.code === '42P07') {
      // Constraint already exists
      console.log('✓ UNIQUE constraint already exists on name column');
    } else {
      throw error;
    }
  }
}

export async function down() {
  console.log('Reverting migration: Drop customers table...');
  await query('DROP TABLE IF EXISTS customers;');
  console.log('✓ customers table dropped');
}
