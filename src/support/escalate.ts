import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export type HandoffReason = 'out_of_scope' | 'low_confidence';

export interface Handoff {
  id: string;
  question: string;
  reason: HandoffReason;
  topScore: number | null;
  createdAt: string;
}

/** Rerank scores below this are treated as too weak to answer on our own. */
const LOW_CONFIDENCE_THRESHOLD = 6;

/** support/handoffs.jsonl in the project root, independent of the current working directory. */
const HANDOFF_FILE = fileURLToPath(new URL('../../support/handoffs.jsonl', import.meta.url));

export function needsHuman(g: {
  noInfo: boolean;
  sources: unknown[];
  topScore: number | null;
}): { escalate: boolean; reason: HandoffReason | null } {
  if (g.noInfo || g.sources.length === 0) {
    return { escalate: true, reason: 'out_of_scope' };
  }

  if (g.topScore != null && g.topScore < LOW_CONFIDENCE_THRESHOLD) {
    return { escalate: true, reason: 'low_confidence' };
  }

  return { escalate: false, reason: null };
}

export async function createHandoff(
  question: string,
  reason: HandoffReason,
  topScore: number | null
): Promise<Handoff> {
  const handoff: Handoff = {
    id: `HO-${Date.now()}`,
    question,
    reason,
    topScore,
    createdAt: new Date().toISOString(),
  };

  await mkdir(dirname(HANDOFF_FILE), { recursive: true });
  await appendFile(HANDOFF_FILE, `${JSON.stringify(handoff)}\n`, 'utf8');

  console.log(`🔔 emberi eszkaláció: ${handoff.id} (${handoff.reason})`);

  return handoff;
}
