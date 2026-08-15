import { hydeAnswer } from './hyde.js';
import { embedQuery, rawSearch } from './rawSearch.js';
import { rerankWithUsage, rerank } from './rerank.js';
import { answer } from './answer.js';
import type { Grounded } from './answer.js';
import type { QueryUsageReport, TokenUsage } from '../pricing.js';
import { calculateCost } from '../pricing.js';

export interface GroundedWithScore extends Grounded {
  /** Top rerank score (0-10) of the retrieved chunks, null if nothing was retrieved. */
  topScore: number | null;
}

export interface GroundedWithUsage extends GroundedWithScore {
  usage: QueryUsageReport;
}

export async function searchKnowledge(question: string): Promise<GroundedWithScore> {
  const result = await searchKnowledgeWithUsage(question);
  const { usage, ...groundedWithout } = result;
  return groundedWithout as GroundedWithScore;
}

export async function searchKnowledgeWithUsage(question: string): Promise<GroundedWithUsage> {
  const steps: TokenUsage[] = [];

  // Step 1: HyDE
  const hydeResult = await hydeAnswer(question);
  const hydeCost = calculateCost(hydeResult.usage.inputTokens, hydeResult.usage.outputTokens, 'gpt-4o-mini');
  steps.push({
    step: 'HyDE (gpt-4o-mini)',
    inputTokens: hydeResult.usage.inputTokens,
    outputTokens: hydeResult.usage.outputTokens,
    totalTokens: hydeResult.usage.inputTokens + hydeResult.usage.outputTokens,
    cost: hydeCost,
  });

  // Step 2: Embed HyDE
  const embedHydeResult = await embedQuery(hydeResult.text);
  const embedCost = calculateCost(embedHydeResult.usage.tokens, 0, 'text-embedding-3-small');
  steps.push({
    step: 'Embed HyDE (OpenAI text-embedding-3-small)',
    inputTokens: embedHydeResult.usage.tokens,
    outputTokens: 0,
    totalTokens: embedHydeResult.usage.tokens,
    cost: embedCost,
  });

  // Step 3: Raw search
  const cand = await rawSearch(embedHydeResult.embedding, 20);

  // Step 4: Rerank
  const rerankResult = await rerankWithUsage(question, cand);
  const rerankCost = calculateCost(rerankResult.usage.inputTokens, rerankResult.usage.outputTokens, 'claude-haiku-4.5');
  steps.push({
    step: 'Rerank (Claude Haiku 4.5)',
    inputTokens: rerankResult.usage.inputTokens,
    outputTokens: rerankResult.usage.outputTokens,
    totalTokens: rerankResult.usage.inputTokens + rerankResult.usage.outputTokens,
    cost: rerankCost,
  });

  // Best rerank score: results are sorted descending, so the first one is the top
  const topScore = rerankResult.results.length > 0 ? rerankResult.results[0].score : null;

  // Step 5: Answer
  const answerResult = await answer(question, rerankResult.results);
  const answerCost = calculateCost(answerResult.usage?.inputTokens ?? 0, answerResult.usage?.outputTokens ?? 0, 'claude-sonnet-4.5');
  steps.push({
    step: 'Answer (Claude Sonnet 4.5)',
    inputTokens: answerResult.usage?.inputTokens ?? 0,
    outputTokens: answerResult.usage?.outputTokens ?? 0,
    totalTokens: (answerResult.usage?.inputTokens ?? 0) + (answerResult.usage?.outputTokens ?? 0),
    cost: answerCost,
  });

  // Aggregate totals
  const totalInputTokens = steps.reduce((sum, s) => sum + s.inputTokens, 0);
  const totalOutputTokens = steps.reduce((sum, s) => sum + s.outputTokens, 0);
  const totalCost = steps.reduce((sum, s) => sum + s.cost, 0);

  return {
    ...answerResult,
    topScore,
    usage: {
      steps,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
    },
  };
}
