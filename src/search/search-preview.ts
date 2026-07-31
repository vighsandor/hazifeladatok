import { embedQuery, rawSearch } from './rawSearch.js';
import { closePool } from '../db.js';

const questions = [
  'What are the XAdES baseline signature levels?',
  'Which data must a qualified certificate for a natural person contain?',
  'How is a PAdES document time-stamp signature defined?',
];

async function searchPreview() {
  console.log('\n🔍 Vector Search Preview\n');
  console.log('═══════════════════════════════════════════════════\n');

  for (const question of questions) {
    console.log(`❓ Query: "${question}"\n`);

    const queryEmbedding = await embedQuery(question);
    const hits = await rawSearch(queryEmbedding, 5);

    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      const preview = hit.content.substring(0, 150).replace(/\n/g, ' ');
      console.log(
        `${i + 1}. ${hit.distance.toFixed(4)} · ${hit.source_id} · ${hit.clause_path}`
      );
      console.log(`   "${preview}..."\n`);
    }

    console.log('───────────────────────────────────────────────────\n');
  }

  await closePool();
}

searchPreview().catch(console.error);
