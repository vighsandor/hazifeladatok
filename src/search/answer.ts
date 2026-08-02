import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { Hit } from './rawSearch.js';

export interface Grounded {
  answer: string;
  sources: { source_id: string; clause_path: string; source_url: string }[];
  noInfo: boolean;
}

function detectLanguage(text: string): 'en' | 'hu' {
  const hungarianChars = /[áéíóöőúüűaa-z]/i.test(text);
  const hungarianWords = /\b(milyen|hogyan|mit|miben|mivel|melyik|kell|lehet|van|lehet|nincs)\b/i;
  const englishWords = /\b(what|how|which|is|are|does|can|may|should|would)\b/i;
  
  const hungarianScore = hungarianWords.test(text) ? 2 : 0;
  const englishScore = englishWords.test(text) ? 2 : 0;
  
  return hungarianScore > englishScore ? 'hu' : 'en';
}

export async function answer(
  question: string,
  top: Array<Hit & { score?: number }>
): Promise<Grounded> {
  const lang = detectLanguage(question);
  const languageInstruction = lang === 'hu' 
    ? 'Your response MUST be in Hungarian. Write everything in Hungarian, including formatting.'
    : 'Your response MUST be in English. Write everything in English, including formatting.';

  // Format context
  const context = top
    .map(
      (hit) =>
        `--- [${hit.source_id} | ${hit.clause_path} | ${hit.source_url}] ---\n${hit.content}`
    )
    .join('\n\n');

  const system = `You are an assistant for ETSI electronic-signature standards.

${languageInstruction} This is MANDATORY and overrides any other instruction.

MOST IMPORTANT RULES:
1. You know nothing that is not in the provided context chunks. Answer ONLY from those chunks.
2. Keep ONLY the standard identifiers and clause references in English, e.g. [ETSI EN 319 132-1, 6.1]. Everything else must be in the specified language.
3. Cite every claim inline with its source id and clause.
4. If the provided chunks do not contain the answer, reply with EXACTLY this sentence and nothing else: "Erről nincs információ a tudásbázisban." Never invent sources or facts.`;

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
