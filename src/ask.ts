import { searchKnowledgeWithUsage } from './search/pipeline.js';
import { closePool } from './db.js';
import { formatCost } from './pricing.js';

const question = process.argv.slice(2).join(' ');

if (!question || question.trim() === '') {
  console.log('\nUsage: npm run ask "your question"\n');
  process.exit(0);
}

(async () => {
  try {
    const result = await searchKnowledgeWithUsage(question);
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

    // Token and cost report
    console.log('📊 Token Usage & Cost:');
    console.log('─'.repeat(80));
    for (const step of result.usage.steps) {
      const tokens = step.totalTokens > 0 ? `${step.totalTokens} tok` : '(embedding)';
      console.log(`  ${step.step.padEnd(45)} ${tokens.padStart(12)} ${formatCost(step.cost).padStart(12)}`);
    }
    console.log('─'.repeat(80));
    const totalTokensStr = `${result.usage.totalInputTokens + result.usage.totalOutputTokens} tok`;
    console.log(`  ${'Total'.padEnd(45)} ${totalTokensStr.padStart(12)} ${formatCost(result.usage.totalCost).padStart(12)}`);
    console.log('');

    await closePool();
  } catch (error) {
    console.error('Error:', error);
    await closePool();
    process.exit(1);
  }
})();
