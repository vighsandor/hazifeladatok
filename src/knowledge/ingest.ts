import { loadDocs } from '../ingest/load.js';
import { chunkDoc, type Chunk } from '../ingest/chunk.js';
import { embedTexts } from '../ingest/embed.js';
import { createHash } from 'node:crypto';
import { query, closePool } from '../db.js';

function hashSHA256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function cleanText(text: string): string {
  // Remove null bytes and other invalid UTF-8 sequences
  return text.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

async function ingest() {
  console.log('\n📥 Starting knowledge base ingestion...\n');

  const docs = await loadDocs();
  console.log(`📄 Loaded ${docs.length} documents`);

  let totalChunks = 0;
  const allChunks: (Chunk & { doc_text: string })[] = [];

  for (const doc of docs) {
    const chunks = chunkDoc({ id: doc.id, url: doc.url, text: doc.text });
    totalChunks += chunks.length;
    allChunks.push(
      ...chunks.map((c) => ({
        ...c,
        doc_text: doc.text,
      }))
    );
  }

  console.log(`📦 Created ${totalChunks} chunks`);

  // Compute hashes
  console.log(`\n🔐 Computing content and document hashes...`);
  const chunksWithHashes = allChunks.map((chunk) => ({
    ...chunk,
    content_hash: hashSHA256(chunk.content),
    doc_hash: hashSHA256(chunk.doc_text),
  }));

  // Embed texts
  console.log(`\n🧠 Embedding ${totalChunks} chunks with OpenAI...`);
  const contents = chunksWithHashes.map((c) => c.content);
  const { embeddings, usage } = await embedTexts(contents);

  console.log(`✅ Embedded ${embeddings.length} chunks (${usage.prompt_tokens} tokens)`);

  // Insert into DB
  console.log(`\n💾 Inserting into database...`);
  let inserted = 0;
  let skipped = 0;
  const batchSize = 200;

  for (let i = 0; i < chunksWithHashes.length; i += batchSize) {
    const batch = chunksWithHashes.slice(i, i + batchSize);
    const embeddingsBatch = embeddings.slice(i, i + batchSize);

    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const embedding = embeddingsBatch[j];
      const embeddingLiteral = '[' + embedding.join(',') + ']';

      const cleanedContent = cleanText(chunk.content);
      const result = await query(
        `INSERT INTO knowledge_chunks
         (source_id, source_url, clause_path, content, content_hash, doc_hash, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
         ON CONFLICT (content_hash) DO NOTHING`,
        [
          chunk.source_id,
          chunk.source_url,
          chunk.clause_path,
          cleanedContent,
          chunk.content_hash,
          chunk.doc_hash,
          embeddingLiteral,
        ]
      );

      if (result.rowCount && result.rowCount > 0) {
        inserted++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`✅ Inserted: ${inserted}, Skipped (conflicts): ${skipped}`);

  // Cost calculation
  const costUSD = (usage.prompt_tokens / 1e6) * 0.02;

  console.log(`\n📊 Ingestion Summary:`);
  console.log(`  Documents: ${docs.length}`);
  console.log(`  Chunks: ${totalChunks}`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped (ON CONFLICT): ${skipped}`);
  console.log(`  Embedding tokens: ${usage.prompt_tokens}`);
  console.log(`  Estimated cost: $${costUSD.toFixed(4)}\n`);

  await closePool();
}

ingest().catch(console.error);
