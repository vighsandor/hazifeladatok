import { Pool, type QueryResult } from 'pg';
import { getEnv } from './env.js';

const env = getEnv();
export const pool = new Pool({ connectionString: env.DATABASE_URL });

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  return pool.query(text, params);
}

export async function closePool(): Promise<void> {
  await pool.end();
}
