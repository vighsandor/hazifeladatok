import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { query } from '../db.js';

export interface Hit {
  source_id: string;
  source_url: string;
  clause_path: string;
  content: string;
  distance: number;
}

export interface EmbedResult {
  embedding: number[];
  usage: {
    tokens: number;
  };
}

export async function embedQuery(q: string): Promise<EmbedResult> {
  const result = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: q,
  });
  return {
    embedding: result.embedding,
    usage: {
      tokens: result.usage?.tokens ?? 0,
    },
  };
}

export async function rawSearch(queryEmbedding: number[], k: number): Promise<Hit[]> {
  const embeddingLiteral = '[' + queryEmbedding.join(',') + ']';

  const result = await query(
    `SELECT source_id, source_url, clause_path, content, embedding <=> $1::vector AS distance
     FROM knowledge_chunks
     ORDER BY distance
     LIMIT $2`,
    [embeddingLiteral, k]
  );

  return result.rows.map((row) => ({
    source_id: row.source_id,
    source_url: row.source_url,
    clause_path: row.clause_path,
    content: row.content,
    distance: parseFloat(row.distance),
  }));
}
