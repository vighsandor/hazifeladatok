import { searchKnowledge } from './search/pipeline.js';
import { closePool } from './db.js';

const question = process.argv.slice(2).join(' ');

if (!question || question.trim() === '') {
  console.log('\nUsage: npm run ask "your question"\n');
  process.exit(0);
}

(async () => {
  try {
    const result = await searchKnowledge(question);
    console.log(`\n${result.answer}\n`);

    if (!result.noInfo && result.sources.length > 0) {
      console.log('Források:');
      const seenSources = new Set<string>();
      for (const source of result.sources) {
        const key = `${source.source_id}|${source.clause_path}`;
        if (!seenSources.has(key)) {
          console.log(`  ${source.source_id} · ${source.clause_path} · ${source.source_url}`);
          seenSources.add(key);
        }
      }
      console.log('');
    }

    await closePool();
  } catch (error) {
    console.error('Error:', error);
    await closePool();
    process.exit(1);
  }
})();
