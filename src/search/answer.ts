import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { Hit } from './rawSearch.js';

export interface Grounded {
  answer: string;
  sources: { source_id: string; clause_path: string; source_url: string }[];
  noInfo: boolean;
}

export async function answer(
  question: string,
  top: Array<Hit & { score?: number }>
): Promise<Grounded> {
  // Format context
  const context = top
    .map(
      (hit) =>
        `--- [${hit.source_id} | ${hit.clause_path} | ${hit.source_url}] ---\n${hit.content}`
    )
    .join('\n\n');

  const system = `You are an assistant for ETSI electronic-signature standards. MOST IMPORTANT RULE: you know nothing that is not in the provided context chunks. Answer ONLY from those chunks. Cite every claim inline with its source id and clause, e.g. [ETSI EN 319 132-1, 6.1]. If the provided chunks do not contain the answer, reply with EXACTLY this sentence and nothing else: "Erről nincs információ a tudásbázisban." Never invent sources or facts.`;

  const prompt = `Context:\n\n${context}\n\nQuestion: ${question}`;

  const result = await generateText({
    model: anthropic('claude-sonnet-4-5'),
    system,
    prompt,
  });

  const answerText = result.text.trim();
  const noInfo = answerText === 'Erről nincs információ a tudásbázisban.';

  let sources: { source_id: string; clause_path: string; source_url: string }[] = [];

  if (!noInfo) {
    // Extract cited sources from answer (format: [ETSI EN 319 132-1, 6.1])
    const citedSources = new Set<string>();
    const sourcePattern = /\[([^,\]]+),\s*([^\]]+)\]/g;
    let match;

    while ((match = sourcePattern.exec(answerText)) !== null) {
      const sourceId = match[1].trim();
      const clausePath = match[2].trim();
      citedSources.add(`${sourceId}|${clausePath}`);
    }

    // Map to full hit data
    if (citedSources.size > 0) {
      sources = top
        .filter((hit) => citedSources.has(`${hit.source_id}|${hit.clause_path}`))
        .map((hit) => ({
          source_id: hit.source_id,
          clause_path: hit.clause_path,
          source_url: hit.source_url,
        }));

      // Remove duplicates and limit to top 5
      const sourceMap = new Map<string, typeof sources[0]>();
      sources.forEach((s) => sourceMap.set(`${s.source_id}|${s.clause_path}`, s));
      sources = Array.from(sourceMap.values()).slice(0, 5);
    }

    // Fallback: if no citations found, use top 5
    if (sources.length === 0) {
      sources = top.slice(0, 5).map((hit) => ({
        source_id: hit.source_id,
        clause_path: hit.clause_path,
        source_url: hit.source_url,
      }));
    }
  }

  return {
    answer: answerText,
    sources,
    noInfo,
  };
}
