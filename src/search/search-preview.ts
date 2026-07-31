import { embedQuery, rawSearch } from './rawSearch.js';
import { hydeAnswer } from './hyde.js';
import { rerank } from './rerank.js';
import { closePool } from '../db.js';

const questions = [
  'What are the XAdES baseline signature levels?',
  'Which data must a qualified certificate for a natural person contain?',
  'How is a PAdES document time-stamp signature defined?',
];

async function searchPreview() {
  console.log('\n🔍 Rerank Search Comparison\n');
  console.log('═══════════════════════════════════════════════════\n');

  for (const question of questions) {
    console.log(`❓ Query: "${question}"\n`);

    // HyDE search top-20
    const hydeText = await hydeAnswer(question);
    const hydeEmbedding = await embedQuery(hydeText);
    const candidates = await rawSearch(hydeEmbedding, 20);

    // (a) Original HyDE search top-5
    console.log('(a) HyDE Search - Original Top 5:');
    for (let i = 0; i < Math.min(5, candidates.length); i++) {
      const hit = candidates[i];
      console.log(
        `  ${i + 1}. ${hit.distance.toFixed(4)} · ${hit.source_id} · ${hit.clause_path}`
      );
    }
    console.log('');

    // (b) Reranked top-5
    console.log('(b) Reranked - Top 5:');
    const rerankResults = await rerank(question, candidates);
    for (let i = 0; i < rerankResults.length; i++) {
      const hit = rerankResults[i];
      console.log(`  ${i + 1}. ${hit.score} · ${hit.source_id} · ${hit.clause_path}`);
    }

    console.log('\n───────────────────────────────────────────────────\n');
  }

  await closePool();
}

searchPreview().catch(console.error);
