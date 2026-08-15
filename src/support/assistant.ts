import { searchKnowledge } from '../search/pipeline.js';
import { needsHuman, createHandoff } from './escalate.js';

export interface CustomerReply {
  mode: 'answer' | 'handoff';
  answer?: string;
  sources?: { source_id: string; clause_path: string; source_url: string }[];
  handoffId?: string;
  reason?: string;
  latencyMs: number;
}

export async function customerAsk(question: string): Promise<CustomerReply> {
  const startedAt = Date.now();
  const grounded = await searchKnowledge(question);
  const latencyMs = Date.now() - startedAt;

  const { escalate, reason } = needsHuman({
    noInfo: grounded.noInfo,
    sources: grounded.sources,
    topScore: grounded.topScore,
  });

  if (escalate && reason !== null) {
    const handoff = await createHandoff(question, reason, grounded.topScore);

    return {
      mode: 'handoff',
      answer: `Ebben nem vagyok biztos, ezért továbbítottam egy szakemberünknek, aki jelentkezni fog. (Hivatkozás: ${handoff.id})`,
      handoffId: handoff.id,
      reason: handoff.reason,
      latencyMs,
    };
  }

  return {
    mode: 'answer',
    answer: grounded.answer,
    sources: grounded.sources,
    latencyMs,
  };
}
