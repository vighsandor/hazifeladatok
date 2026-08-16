/**
 * Exports the knowledge_chunks table to db/knowledge_dump.sql.
 *
 * The dump is DATA ONLY: plain INSERT statements, no schema. The schema comes from
 * `npm run migrate` (src/db/migrate.ts), which is the single source of truth for it —
 * an information_schema-derived CREATE TABLE cannot express a pgvector column and
 * produced invalid SQL ("USER-DEFINED").
 *
 * Uses the pg client directly, so no pg_dump / psql is needed. The matching loader
 * is scripts/restore-db.ts (`npm run db:restore`).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(rootDir, '.env') });

/**
 * created_at is `timestamp without time zone`. By default the pg client turns it into a
 * JS Date interpreted in the *local* zone, and Date.toISOString() then shifts it by the
 * local offset — so every dump→restore cycle would move the value by that offset.
 * Keep the raw string from the server instead (OID 1114), only swapping the space for
 * the ISO "T" separator. No zone designator: the column has no zone.
 */
pg.types.setTypeParser(1114, (value) => value.replace(' ', 'T'));

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL not set in .env');
  process.exit(1);
}

const dbDir = path.join(rootDir, 'db');
const dumpFile = path.join(dbDir, 'knowledge_dump.sql');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 Created directory: db/');
}

/** Renders one column value as a SQL literal. */
function toSqlLiteral(column, value) {
  if (value === null || value === undefined) return 'NULL';

  // pgvector comes back as the string "[0.1,0.2,...]"; arrays only if a parser is registered.
  if (column === 'embedding') {
    const literal = Array.isArray(value) ? `[${value.join(',')}]` : String(value);
    return `'${literal}'::vector`;
  }

  // Timestamps arrive as ISO strings (see the type parser above); a Date here would mean
  // a column we do not handle yet, so render it without an implicit zone shift.
  if (value instanceof Date) return `'${value.toISOString()}'`;

  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  return `'${String(value).replace(/'/g, "''")}'`;
}

console.log('🔄 Dumping knowledge_chunks...');

const client = new pg.Client({ connectionString: databaseUrl });

try {
  await client.connect();

  const { rows } = await client.query('SELECT * FROM knowledge_chunks ORDER BY id');

  if (rows.length === 0) {
    console.error('❌ ERROR: knowledge_chunks is empty — nothing to dump.');
    process.exit(1);
  }

  const columns = Object.keys(rows[0]);
  const columnList = columns.map((c) => `"${c}"`).join(', ');

  const header =
    '-- knowledge_chunks data dump (INSERT only, no schema).\n' +
    '-- Create the schema first: npm run migrate\n' +
    '-- Load it with: npm run db:restore\n' +
    `-- Rows: ${rows.length}\n\n`;

  const statements = rows.map((row) => {
    const values = columns.map((c) => toSqlLiteral(c, row[c])).join(', ');
    return `INSERT INTO knowledge_chunks (${columnList}) VALUES (${values}) ON CONFLICT DO NOTHING;`;
  });

  fs.writeFileSync(dumpFile, header + statements.join('\n') + '\n', 'utf-8');

  const sizeMb = (fs.statSync(dumpFile).size / 1024 / 1024).toFixed(2);
  console.log(`\n✅ Dump completed`);
  console.log(`   File:    db/knowledge_dump.sql`);
  console.log(`   Rows:    ${rows.length}`);
  console.log(`   Columns: ${columns.join(', ')}`);
  console.log(`   Size:    ${sizeMb} MB`);
} catch (err) {
  console.error('❌ ERROR: Failed to dump database:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
