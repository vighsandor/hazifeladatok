import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface RunLogger {
  file: string;
  log(entry: Record<string, unknown>): void;
}

/**
 * Minden agent-futás külön JSONL fájlba naplózódik (logs/<idő>.jsonl).
 * Egy sor = egy esemény (run_start, assistant, tool_use, tool_result, run_end).
 * Így utólag pontosan visszakövethető, mit gondolt és tett az agent.
 */
export function createRunLogger(): RunLogger {
  const dir = process.env.LOG_DIR ?? 'logs';
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(dir, `${stamp}.jsonl`);

  return {
    file,
    log(entry) {
      const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + '\n';
      appendFileSync(file, line);
    },
  };
}
