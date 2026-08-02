import { embedQuery, rawSearch } from './rawSearch.js';
import { hydeAnswer } from './hyde.js';
import { rerank } from './rerank.js';
import { answer } from './answer.js';
import { closePool } from '../db.js';

const questions = [
  'What are the XAdES baseline signature levels?',
  'Which data must a qualified certificate for a natural person contain?',
  'How is a PAdES document time-stamp signature defined?',
  'What is the capital of France?', // Out-of-domain test
];

async function searchPreview() {
  console.log('\n🔍 Grounded Answer Generation\n');
  console.log('═══════════════════════════════════════════════════\n');

  for (const question of questions) {
    console.log(`❓ Query: "${question}"\n`);

    // Full chain: HyDE → search → rerank → answer
    const hydeText = await hydeAnswer(question);
    const hydeEmbedding = await embedQuery(hydeText);
    const candidates = await rawSearch(hydeEmbedding, 20);
    const rerankResults = await rerank(question, candidates);
    const grounded = await answer(question, rerankResults);

    console.log(`Answer:\n${grounded.answer}\n`);

    if (!grounded.noInfo && grounded.sources.length > 0) {
      console.log('Sources:');
      for (const source of grounded.sources) {
        console.log(`  - ${source.source_id} | ${source.clause_path}`);
      }
    }

    console.log('\n───────────────────────────────────────────────────\n');
  }

  await closePool();
}

searchPreview().catch(console.error);
