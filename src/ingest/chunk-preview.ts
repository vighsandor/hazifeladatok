import { loadDocs } from './load.js';
import { chunkDoc } from './chunk.js';

async function chunkPreview() {
  const docs = await loadDocs();

  // Part 1: ETSI EN 319 132-1 detailed analysis
  const xadesDoc = docs.find((d) => d.id === 'ETSI EN 319 132-1');
  if (xadesDoc) {
    const chunks = chunkDoc(
      { id: xadesDoc.id, url: xadesDoc.url, text: xadesDoc.text },
      { maxChars: 2000, overlapSentences: 1 }
    );

    console.log('\n═══════════════════════════════════════════════════\n');
    console.log('📄 ETSI EN 319 132-1 (XAdES) - Detailed Analysis\n');

    const lengths = chunks.map((c) => c.content.length);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    const avgLen = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
    const under200 = chunks.filter((c) => c.content.length < 200).length;

    console.log(`Total chunks: ${chunks.length}`);
    console.log(`Min: ${minLen} chars`);
    console.log(`Avg: ${avgLen} chars`);
    console.log(`Max: ${maxLen} chars`);
    console.log(`Chunks under 200 chars: ${under200}\n`);

    // Find 5 sample chunks around section 6
    console.log('Sample chunks around section 6:\n');
    let found = 0;
    for (const chunk of chunks) {
      if (chunk.clause_path.startsWith('6')) {
        console.log(`───────────────────────────────────────────────────`);
        console.log(`Clause: ${chunk.clause_path}`);
        console.log(`Content (first 300 chars):`);
        console.log(chunk.content.substring(0, 300));
        console.log('');
        found++;
        if (found >= 5) break;
      }
    }
  }

  // Part 2: Statistics for all 20 documents
  console.log('\n═══════════════════════════════════════════════════\n');
  console.log('📊 All 20 Documents - Global Statistics\n');

  let totalChunks = 0;
  let allLengths: number[] = [];
  const docStats: { id: string; chunks: number }[] = [];

  for (const doc of docs) {
    const chunks = chunkDoc(
      { id: doc.id, url: doc.url, text: doc.text },
      { maxChars: 2000, overlapSentences: 1 }
    );
    totalChunks += chunks.length;
    allLengths.push(...chunks.map((c) => c.content.length));
    docStats.push({ id: doc.id, chunks: chunks.length });
  }

  const minLen = Math.min(...allLengths);
  const maxLen = Math.max(...allLengths);
  const avgLen = Math.round(allLengths.reduce((a, b) => a + b, 0) / allLengths.length);

  console.log(`Total chunks (all 20 docs): ${totalChunks}`);
  console.log(`Global min: ${minLen} chars`);
  console.log(`Global avg: ${avgLen} chars`);
  console.log(`Global max: ${maxLen} chars\n`);

  console.log('Chunks per document:\n');
  for (const stat of docStats) {
    console.log(`  ${stat.id.padEnd(25)} → ${stat.chunks} chunks`);
  }
  console.log('\n═══════════════════════════════════════════════════\n');
}

chunkPreview().catch(console.error);
