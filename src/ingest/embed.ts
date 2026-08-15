import 'dotenv/config';
import OpenAI from 'openai';
import { getEnv } from '../env.js';

const env = getEnv();
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface EmbedResult {
  embeddings: number[][];
  usage: { prompt_tokens: number };
}

export async function embedTexts(texts: string[]): Promise<EmbedResult> {
  const embeddings: number[][] = [];
  let totalTokens = 0;
  const batchSize = 100;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const result = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });

    embeddings.push(...result.data.map((d) => d.embedding as number[]));
    totalTokens += result.usage.prompt_tokens;
  }

  return { embeddings, usage: { prompt_tokens: totalTokens } };
}
