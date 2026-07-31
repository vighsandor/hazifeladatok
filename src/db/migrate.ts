import { query, closePool } from '../db.js';

const migrationSQL = `
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id           SERIAL PRIMARY KEY,
  source_id    TEXT NOT NULL,
  source_url   TEXT NOT NULL,
  clause_path  TEXT,
  content      TEXT NOT NULL,
  content_hash TEXT NOT NULL UNIQUE,
  doc_hash     TEXT NOT NULL,
  embedding    vector(1536) NOT NULL,
  created_at   TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_chunks_source_idx ON knowledge_chunks(source_id);
`;

async function migrate() {
  try {
    await query(migrationSQL);

    const result = await query(`
      SELECT column_name, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_chunks' 
      ORDER BY ordinal_position;
    `);

    console.log('\nColumns in knowledge_chunks:');
    result.rows.forEach((row) => {
      console.log(`  ${row.column_name}: ${row.udt_name}`);
    });

    console.log('\n»migration done');
  } finally {
    await closePool();
  }
}

migrate().catch(console.error);
