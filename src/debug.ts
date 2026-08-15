import { embedQuery, rawSearch } from './search/rawSearch.js';
import { hydeAnswer } from './search/hyde.js';
import { rerank } from './search/rerank.js';
import { closePool } from './db.js';

const question = process.argv.slice(2).join(' ');

if (!question || question.trim() === '') {
  console.log('\nUsage: npm run debug "your question"\n');
  process.exit(0);
}

(async () => {
  try {
    // NYERS (question embedding)
    console.log('\n════════════════════════════════════════════════════\n');
    console.log('📊 NYERS (Raw Question Embedding)\n');
    const queryEmbedding = await embedQuery(question);
    const rawHits = await rawSearch(queryEmbedding, 10);
    for (let i = 0; i < rawHits.length; i++) {
      const hit = rawHits[i];
      const preview = hit.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(
        `${i + 1}. ${hit.distance.toFixed(4)} · ${hit.source_id} · ${hit.clause_path} · "${preview}..."`
      );
    }

    console.log('\n════════════════════════════════════════════════════\n');

    // HyDE
    console.log('🧠 HyDE (Hypothetical Document)\n');
    const hydeText = await hydeAnswer(question);
    console.log(`Generated: "${hydeText}"\n`);
    const hydeEmbedding = await embedQuery(hydeText);
    const hydeHits = await rawSearch(hydeEmbedding, 10);
    for (let i = 0; i < hydeHits.length; i++) {
      const hit = hydeHits[i];
      const preview = hit.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(
        `${i + 1}. ${hit.distance.toFixed(4)} · ${hit.source_id} · ${hit.clause_path} · "${preview}..."`
      );
    }

    console.log('\n════════════════════════════════════════════════════\n');

    // TELJES (reranked)
    console.log('✨ TELJES (HyDE + Reranked Top 5)\n');
    const candidates = await rawSearch(hydeEmbedding, 20);
    const rerankResults = await rerank(question, candidates);
    for (let i = 0; i < rerankResults.length; i++) {
      const hit = rerankResults[i];
      const preview = hit.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(
        `${i + 1}. ${hit.score} · ${hit.source_id} · ${hit.clause_path} · "${preview}..."`
      );
    }

    console.log('\n════════════════════════════════════════════════════\n');

    await closePool();
  } catch (error) {
    console.error('Error:', error);
    await closePool();
    process.exit(1);
  }
})();
