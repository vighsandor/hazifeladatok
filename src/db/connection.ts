import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL environment variable not set.');
  console.error('Please create .env file with: DATABASE_URL=postgresql://...');
  process.exit(1);
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`Executed query in ${duration}ms:`, text.substring(0, 50) + '...');
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function closePool() {
  await pool.end();
}
