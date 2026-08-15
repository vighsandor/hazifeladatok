import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface InteractionEvent {
  question: string;
  mode: 'answer' | 'handoff';
  reason?: string;
  topScore: number | null;
  latencyMs: number;
  sourcesCount: number;
}

export interface LoggedInteraction extends InteractionEvent {
  ts: string;
}

/** logs/interactions.jsonl in the project root, independent of the current working directory. */
export const LOG_FILE = fileURLToPath(new URL('../../logs/interactions.jsonl', import.meta.url));

/**
 * Appends one interaction to the JSONL log.
 *
 * Only the fields of InteractionEvent are written: apart from the question itself
 * no personal data (user id, IP, session, headers) is ever recorded here.
 */
export async function logInteraction(e: InteractionEvent): Promise<void> {
  const entry: LoggedInteraction = {
    ts: new Date().toISOString(),
    question: e.question,
    mode: e.mode,
    topScore: e.topScore,
    latencyMs: e.latencyMs,
    sourcesCount: e.sourcesCount,
  };

  if (e.reason !== undefined) {
    entry.reason = e.reason;
  }

  await mkdir(dirname(LOG_FILE), { recursive: true });
  await appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
}
