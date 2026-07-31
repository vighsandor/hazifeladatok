import { embedQuery, rawSearch } from './rawSearch.js';
import { hydeAnswer } from './hyde.js';
import { closePool } from '../db.js';

const questions = [
  'What are the XAdES baseline signature levels?',
  'Which data must a qualified certificate for a natural person contain?',
  'How is a PAdES document time-stamp signature defined?',
];

async function searchPreview() {
  console.log('\n🔍 HyDE Search Comparison\n');
  console.log('═══════════════════════════════════════════════════\n');

  for (const question of questions) {
    console.log(`❓ Query: "${question}"\n`);

    // (a) HyDE answer
    console.log('(a) HyDE Generated Answer:');
    const hydeText = await hydeAnswer(question);
    console.log(`"${hydeText}"\n`);

    // (b) Raw search (question embedding)
    console.log('(b) Raw Search (Question Embedding) - Top 3:');
    const queryEmbedding = await embedQuery(question);
    const rawHits = await rawSearch(queryEmbedding, 3);
    for (const hit of rawHits) {
      console.log(`  ${hit.distance.toFixed(4)} · ${hit.source_id} · ${hit.clause_path}`);
    }
    console.log('');

    // (c) HyDE search (HyDE embedding)
    console.log('(c) HyDE Search (HyDE Text Embedding) - Top 3:');
    const hydeEmbedding = await embedQuery(hydeText);
    const hydeHits = await rawSearch(hydeEmbedding, 3);
    for (const hit of hydeHits) {
      console.log(`  ${hit.distance.toFixed(4)} · ${hit.source_id} · ${hit.clause_path}`);
    }

    console.log('\n───────────────────────────────────────────────────\n');
  }

  await closePool();
}

searchPreview().catch(console.error);
