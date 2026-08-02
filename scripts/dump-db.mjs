import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';
import { URL } from 'url';
import pg from 'pg';
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

const dbDir = path.join(rootDir, 'db');
const dumpFile = path.join(dbDir, 'knowledge_dump.sql');

// Create db/ directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 Created directory: db/`);
}

console.log(`🔄 Starting database dump...`);
console.log(`   Host: ${parsed.host}:${parsed.port}`);
console.log(`   Database: ${parsed.db}`);
console.log(`   Target: ${dumpFile}\n`);

// Set up environment for pg_dump
const env = { ...process.env, PGPASSWORD: parsed.password };

// Try pg_dump first
let usedPgDump = false;
try {
  const pgDumpCmd = `pg_dump -h ${parsed.host} -p ${parsed.port} -U ${parsed.user} -d ${parsed.db} --no-owner --no-privileges -t knowledge_chunks`;
  console.log(`⚙️  Attempting pg_dump...`);
  const dumpOutput = execSync(pgDumpCmd, { env, encoding: 'utf-8', stdio: 'pipe' });

  // Check if CREATE EXTENSION is present
  const hasExtension = dumpOutput.includes('CREATE EXTENSION');

  // Prepend CREATE EXTENSION if missing
  let finalSql = dumpOutput;
  if (!hasExtension) {
    finalSql = 'CREATE EXTENSION IF NOT EXISTS vector;\n\n' + dumpOutput;
    console.log(`✓ Prepended CREATE EXTENSION IF NOT EXISTS vector;`);
  } else {
    console.log(`✓ CREATE EXTENSION already present in dump`);
  }

  // Write to file
  fs.writeFileSync(dumpFile, finalSql, 'utf-8');
  usedPgDump = true;
} catch (err) {
  // pg_dump not available, fall back to programmatic dump
  console.log(`⚠️  pg_dump not available, using programmatic fallback...\n`);
}

if (!usedPgDump) {
  // Fallback: Use pg client to query and generate SQL
  try {
    const client = new pg.Client(databaseUrl);
    await client.connect();

    // Get table schema
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'knowledge_chunks'
      ORDER BY ordinal_position
    `);

    // Get all rows
    const dataResult = await client.query('SELECT * FROM knowledge_chunks ORDER BY id');

    // Generate CREATE TABLE statement
    let createTableSql = 'CREATE TABLE IF NOT EXISTS knowledge_chunks (\n';
    const columnDefs = schemaResult.rows.map(col => {
      let def = `  "${col.column_name}" ${col.data_type}`;
      if (col.column_default) def += ` DEFAULT ${col.column_default}`;
      if (col.is_nullable === 'NO') def += ' NOT NULL';
      if (col.column_name === 'id') def += ' PRIMARY KEY';
      return def;
    });

    createTableSql += columnDefs.join(',\n') + '\n);\n\n';

    // Generate INSERT statements
    let insertSql = '';
    for (const row of dataResult.rows) {
      const columns = Object.keys(row);
      const values = Object.values(row).map(v => {
        if (v === null) return 'NULL';
        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
        if (Array.isArray(v)) return `'[${v.join(',')}]'::vector`;
        return String(v);
      });

      insertSql += `INSERT INTO knowledge_chunks (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
    }

    const fullSql = 'CREATE EXTENSION IF NOT EXISTS vector;\n\n' + createTableSql + insertSql;

    // Write to file
    fs.writeFileSync(dumpFile, fullSql, 'utf-8');
    console.log(`✓ Generated schema from information_schema`);
    console.log(`✓ Inserted ${dataResult.rows.length} rows`);

    await client.end();
  } catch (err) {
    console.error('❌ ERROR: Failed to dump database:', err.message);
    process.exit(1);
  }
}

// Get file size
const stats = fs.statSync(dumpFile);
const sizeKb = (stats.size / 1024).toFixed(2);

console.log(`\n✅ Dump completed successfully`);
console.log(`   File: db/knowledge_dump.sql`);
console.log(`   Size: ${sizeKb} KB (${stats.size} bytes)`);
console.log(`   Method: ${usedPgDump ? 'pg_dump' : 'programmatic (pg client)'}`);
