/**
 * Loads db/knowledge_dump.sql into the database given by DATABASE_URL.
 *
 * Uses the pg client directly — no psql needed. The dump is data only, so the schema
 * must exist first: run `npm run migrate`.
 *
 * The INSERTs carry ON CONFLICT DO NOTHING, so a restore over existing data is
 * idempotent. Pass --fresh to empty the table first; the TRUNCATE runs inside the
 * same transaction as the load, so a failure rolls back to the original content.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL not set in .env');
  process.exit(1);
}

const dumpFile = path.join(rootDir, 'db', 'knowledge_dump.sql');

if (!fs.existsSync(dumpFile)) {
  console.error('❌ ERROR: Dump file not found: db/knowledge_dump.sql');
  console.error("   Run 'npm run db:dump' first to create it.");
  process.exit(1);
}

const fresh = process.argv.includes('--fresh');

/**
 * Splits on semicolons that are outside single-quoted literals ('' escapes a quote).
 * `--` line comments are dropped, but only outside a literal — the chunk text itself
 * may well start a line with "--". Comments carry no terminator, so leaving them in
 * would glue the header onto the first INSERT and silently drop that row.
 */
function splitStatements(text: string): string[] {
  const out: string[] = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (!inString && c === '-' && text[i + 1] === '-') {
      const eol = text.indexOf('\n', i);
      if (eol === -1) break;
      i = eol;
      current += '\n';
      continue;
    }

    if (c === "'") {
      if (inString && text[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      inString = !inString;
      current += c;
      continue;
    }

    if (c === ';' && !inString) {
      const stmt = current.trim();
      if (stmt) out.push(stmt);
      current = '';
      continue;
    }

    current += c;
  }

  const tail = current.trim();
  if (tail) out.push(tail);
  return out;
}

const sql = fs.readFileSync(dumpFile, 'utf8');
const inserts = splitStatements(sql).filter((s) => /^INSERT\s+INTO/i.test(s));

if (inserts.length === 0) {
  console.error('❌ ERROR: no INSERT statements found in the dump.');
  process.exit(1);
}

console.log('⚙️  Restore (pg client, psql not required)');
console.log(`   Dump:  db/knowledge_dump.sql — ${inserts.length} INSERT`);
console.log(`   Mode:  ${fresh ? 'FRESH (TRUNCATE + load)' : 'idempotens (ON CONFLICT DO NOTHING)'}\n`);

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  const before = await client.query<{ n: number }>(
    'SELECT count(*)::int AS n FROM knowledge_chunks'
  );

  await client.query('BEGIN');

  if (fresh) {
    await client.query('TRUNCATE knowledge_chunks');
  }

  let done = 0;
  for (const stmt of inserts) {
    await client.query(stmt);
    if (++done % 250 === 0) console.log(`   ${done}/${inserts.length}`);
  }

  // Explicit ids came from the dump, so the SERIAL sequence has to catch up.
  await client.query(
    `SELECT setval('knowledge_chunks_id_seq', COALESCE((SELECT MAX(id) FROM knowledge_chunks), 1))`
  );

  await client.query('COMMIT');

  const after = await client.query<{ n: number }>(
    'SELECT count(*)::int AS n FROM knowledge_chunks'
  );

  console.log(`\n✅ Restore completed`);
  console.log(`   Sorok előtte: ${before.rows[0].n}`);
  console.log(`   Sorok utána:  ${after.rows[0].n}`);
  console.log(
    fresh
      ? `   Betöltve:     ${after.rows[0].n} (a tábla ürítése után)`
      : `   Új sor:       ${after.rows[0].n - before.rows[0].n}`
  );
} catch (err) {
  await client.query('ROLLBACK');
  console.error('❌ ERROR: restore failed, rolled back:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await client.end();
}
