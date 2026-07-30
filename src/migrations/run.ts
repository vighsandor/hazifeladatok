import { up } from './00_init';
import { closePool } from '../db/connection';

async function runMigrations() {
  try {
    console.log('Starting migrations...');
    await up();
    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

runMigrations();
