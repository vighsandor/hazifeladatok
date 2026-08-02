import { embedQuery, rawSearch } from './rawSearch.js';
import { hydeAnswer } from './hyde.js';
import { rerank } from './rerank.js';

export interface DebugResult {
  question: string;
  nyers: Array<{
    rank: number;
    distance: number;
    source_id: string;
    clause_path: string | null;
    preview: string;
  }>;
  hyde: {
    generated: string;
    top10: Array<{
      rank: number;
      distance: number;
      source_id: string;
      clause_path: string | null;
      preview: string;
    }>;
  };
  reranked: Array<{
    rank: number;
    score: number;
    source_id: string;
    clause_path: string | null;
    preview: string;
  }>;
}

export async function debugRetrieval(question: string): Promise<DebugResult> {
  // NYERS (question embedding)
  const queryEmbedding = await embedQuery(question);
  const rawHits = await rawSearch(queryEmbedding, 10);

  const nyers = rawHits.map((hit, i) => ({
    rank: i + 1,
    distance: hit.distance,
    source_id: hit.source_id,
    clause_path: hit.clause_path,
    preview: hit.content.substring(0, 100).replace(/\n/g, ' '),
  }));

  // HyDE
  const hydeText = await hydeAnswer(question);
  const hydeEmbedding = await embedQuery(hydeText);
  const hydeHits = await rawSearch(hydeEmbedding, 10);

  const hyde = {
    generated: hydeText,
    top10: hydeHits.map((hit, i) => ({
      rank: i + 1,
      distance: hit.distance,
      source_id: hit.source_id,
      clause_path: hit.clause_path,
      preview: hit.content.substring(0, 100).replace(/\n/g, ' '),
    })),
  };

  // TELJES (reranked)
  const candidates = await rawSearch(hydeEmbedding, 20);
  const rerankResults = await rerank(question, candidates);

  const reranked = rerankResults.map((hit, i) => ({
    rank: i + 1,
    score: hit.score || 0,
    source_id: hit.source_id,
    clause_path: hit.clause_path,
    preview: hit.content.substring(0, 100).replace(/\n/g, ' '),
  }));

  return {
    question,
    nyers,
    hyde,
    reranked,
  };
}
