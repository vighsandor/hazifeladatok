import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { URL } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL not set in .env');
  process.exit(1);
}

// Parse DATABASE_URL
let parsed;
try {
  const url = new URL(databaseUrl);
  parsed = {
    host: url.hostname,
    port: url.port || '5432',
    user: url.username,
    password: url.password,
    db: url.pathname.replace(/^\//, ''),
  };
} catch (err) {
  console.error('❌ ERROR: Invalid DATABASE_URL format:', err.message);
  process.exit(1);
}

const dumpFile = path.join(rootDir, 'db', 'knowledge_dump.sql');

// Check if dump file exists
if (!fs.existsSync(dumpFile)) {
  console.error(`❌ ERROR: Dump file not found: db/knowledge_dump.sql`);
  console.error(`   Run 'npm run db:dump' first to create the dump.`);
  process.exit(1);
}

console.log(`⚠️  RESTORE WARNING`);
console.log(`   Target database: ${parsed.db}`);
console.log(`   Host: ${parsed.host}:${parsed.port}`);
console.log(`   `);
console.log(`   Ensure pgvector is installed on the PostgreSQL server:`);
console.log(`   postgres=# CREATE EXTENSION IF NOT EXISTS vector;`);
console.log(`   `);
console.log(`   The dump includes CREATE EXTENSION IF NOT EXISTS vector;`);
console.log(`   so it should work automatically.\n`);

// Set up environment for psql
const env = { ...process.env, PGPASSWORD: parsed.password };

try {
  // Run psql to restore
  const psqlCmd = `psql -h ${parsed.host} -p ${parsed.port} -U ${parsed.user} -d ${parsed.db} -f ${dumpFile}`;

  console.log(`⚙️  Running: psql -h ${parsed.host} -p ${parsed.port} -U ${parsed.user} -d ${parsed.db} -f db/knowledge_dump.sql`);
  const output = execSync(psqlCmd, { env, encoding: 'utf-8' });

  console.log(`\n✅ Restore completed successfully`);
  console.log(`   Table: knowledge_chunks`);
  console.log(`   Schema: loaded from db/knowledge_dump.sql`);

  if (output) {
    console.log(`\nPSQL Output:\n${output}`);
  }
} catch (err) {
  if (err.status === 127 || err.message.includes('psql')) {
    console.error('❌ ERROR: psql not found');
    console.error('   Please install postgresql-client package:');
    console.error('   - macOS: brew install postgresql');
    console.error('   - Ubuntu/Debian: sudo apt-get install postgresql-client');
    console.error('   - Windows: Download from https://www.postgresql.org/download/windows/');
  } else {
    console.error('❌ ERROR: Failed to restore database:', err.message);
  }
  process.exit(1);
}
