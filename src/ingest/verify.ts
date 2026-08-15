import { query, closePool } from '../db.js';

async function verify() {
  console.log('\n📊 Query 1: Chunks per document\n');
  const res1 = await query('SELECT source_id, count(*) as count FROM knowledge_chunks GROUP BY source_id ORDER BY source_id');

  for (const row of res1.rows) {
    console.log(`  ${(row.source_id as string).padEnd(25)} → ${row.count} chunks`);
  }

  console.log('\n📊 Query 2: Total chunks and null embeddings\n');
  const res2 = await query('SELECT count(*) as total, count(*) FILTER (WHERE embedding IS NULL) as null_emb FROM knowledge_chunks');

  const row = res2.rows[0];
  console.log(`  Total chunks: ${row.total}`);
  console.log(`  Null embeddings: ${row.null_emb}\n`);

  await closePool();
}

verify().catch(console.error);
