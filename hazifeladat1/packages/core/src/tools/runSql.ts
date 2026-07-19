import type Anthropic from '@anthropic-ai/sdk';
import { getReadonlyPool } from '../db';
import { assertReadOnlySelect, MAX_ROWS } from './sql-guard';
import type { AgentTool } from './types';

const inputSchema: Anthropic.Tool.InputSchema = {
  type: 'object',
  properties: {
    sql: {
      type: 'string',
      description:
        'Egyetlen csak-olvasó SQL SELECT lekérdezés a products táblára. ' +
        'Használj ILIKE-ot szöveges kereséshez és LIMIT-et a találatszám korlátozására.',
    },
  },
  required: ['sql'],
};

export const runSqlTool: AgentTool = {
  definition: {
    name: 'run_sql',
    description:
      'Lefuttat egy CSAK OLVASÓ SQL SELECT lekérdezést a plantbase PostgreSQL adatbázisán, ' +
      'és visszaadja a sorokat. Egyetlen tábla van: products (növénykatalógus). ' +
      'Csak SELECT/WITH engedélyezett; írás nem lehetséges (read-only kapcsolat).',
    input_schema: inputSchema,
  },

  async run(input) {
    const sql = assertReadOnlySelect(String((input as { sql?: unknown })?.sql ?? ''));
    const pool = getReadonlyPool();
    const client = await pool.connect();
    try {
      // Explicit read-only tranzakció: dupla biztonság a read-only role mellé.
      await client.query('BEGIN READ ONLY');
      const result = await client.query(sql);
      await client.query('COMMIT');
      const rows = result.rows.slice(0, MAX_ROWS);
      return { sql, rowCount: result.rowCount ?? rows.length, rows };
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // a rollback hibáját elnyeljük, az eredeti hiba a fontos
      }
      throw err;
    } finally {
      client.release();
    }
  },
};
