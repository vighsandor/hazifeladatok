import { loadDocs } from './load.js';
import { chunkDoc } from './chunk.js';

async function chunkPreview() {
  const docs = await loadDocs();
  const xadesDoc = docs.find((d) => d.id === 'ETSI EN 319 132-1');

  if (!xadesDoc) {
    console.log('ETSI EN 319 132-1 not found');
    return;
  }

  const chunks = chunkDoc(
    { id: xadesDoc.id, url: xadesDoc.url, text: xadesDoc.text },
    { maxChars: 2000, overlapSentences: 1 }
  );

  console.log(`\n📦 Total chunks: ${chunks.length}\n`);

  const lengths = chunks.map((c) => c.content.length);
  const minLen = Math.min(...lengths);
  const maxLen = Math.max(...lengths);
  const avgLen = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);

  console.log(`📊 Chunk size statistics:`);
  console.log(`  Min: ${minLen} chars`);
  console.log(`  Avg: ${avgLen} chars`);
  console.log(`  Max: ${maxLen} chars\n`);

  // Find section 6 chunks
  console.log(`\n📖 Sample chunks around section 6:\n`);
  let found = 0;
  for (const chunk of chunks) {
    if (chunk.clause_path.startsWith('6')) {
      console.log(`Clause: ${chunk.clause_path}`);
      console.log(`Content (first 200 chars):`);
      console.log(chunk.content.substring(0, 200));
      console.log('---\n');
      found++;
      if (found >= 3) break;
    }
  }
}

chunkPreview().catch(console.error);
