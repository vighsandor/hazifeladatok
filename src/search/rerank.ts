import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { Hit } from './rawSearch.js';

export interface RerankResult {
  results: Array<Hit & { score: number }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function rerankWithUsage(
  question: string,
  candidates: Hit[]
): Promise<RerankResult> {
  // Format candidates for prompt
  const numberedCandidates = candidates
    .map((hit, idx) => {
      const preview = hit.content.substring(0, 400);
      return `[${idx + 1}] (source: ${hit.source_id} ${hit.clause_path}) ${preview}`;
    })
    .join('\n\n');

  const prompt = `You are ranking how well each numbered chunk answers a user question about ETSI electronic-signature standards. For EVERY chunk output exactly one line in the form "N: score" where N is the chunk number and score is an integer 0-10 (10 = directly and fully answers the question, 0 = irrelevant). Output ONLY these lines, nothing else. Question: ${question}\n\nChunks:\n${numberedCandidates}`;

  const result = await generateText({
    model: anthropic('claude-haiku-4-5'),
    prompt,
  });

  // Parse scores
  const scoredCandidates: Array<Hit & { score: number }> = [];
  const lines = result.text.split('\n');

  for (const line of lines) {
    const match = line.trim().match(/^(\d+):\s*(\d+)$/);
    if (match) {
      const index = parseInt(match[1], 10) - 1;
      const score = parseInt(match[2], 10);
      if (index >= 0 && index < candidates.length) {
        scoredCandidates.push({
          ...candidates[index],
          score,
        });
      }
    }
  }

  // Fallback if parsing failed
  if (scoredCandidates.length === 0) {
    return candidates.slice(0, 5).map((hit) => ({
      ...hit,
      score: -1,
    }));
  }

  // Sort by score descending and return top 5
  const sorted = scoredCandidates.sort((a, b) => b.score - a.score).slice(0, 5);

  return {
    results: sorted,
    usage: {
      inputTokens: result.usage?.promptTokens ?? 0,
      outputTokens: result.usage?.completionTokens ?? 0,
    },
  };
}

// Keep old function for backwards compatibility
export async function rerank(
  question: string,
  candidates: Hit[]
): Promise<Array<Hit & { score: number }>> {
  const res = await rerankWithUsage(question, candidates);
  return res.results;
}
