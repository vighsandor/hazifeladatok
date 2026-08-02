import { hydeAnswer } from './hyde.js';
import { embedQuery, rawSearch } from './rawSearch.js';
import { rerank } from './rerank.js';
import { answer } from './answer.js';
import type { Grounded } from './answer.js';

export async function searchKnowledge(question: string): Promise<Grounded> {
  const h = await hydeAnswer(question);
  const e = await embedQuery(h);
  const cand = await rawSearch(e, 20);
  const top = await rerank(question, cand);
  return await answer(question, top);
}
