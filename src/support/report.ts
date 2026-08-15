import { readFile } from 'node:fs/promises';
import { LOG_FILE } from './log.js';
import type { LoggedInteraction } from './log.js';

async function readInteractions(): Promise<LoggedInteraction[]> {
  let raw: string;

  try {
    raw = await readFile(LOG_FILE, 'utf8');
  } catch (err) {
    // Missing log file is a valid state: nothing has been asked yet.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  const interactions: LoggedInteraction[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    try {
      interactions.push(JSON.parse(trimmed) as LoggedInteraction);
    } catch {
      // A truncated last line (e.g. killed mid-write) must not break the report.
      console.warn(`⚠️  átugrott sérült naplósor: ${trimmed.slice(0, 60)}`);
    }
  }

  return interactions;
}

/** Nearest-rank p90: the smallest value at or above 90% of the sorted samples. */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1];
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

async function main() {
  const interactions = await readInteractions();
  const total = interactions.length;

  const answered = interactions.filter((i) => i.mode === 'answer');
  const escalated = interactions.filter((i) => i.mode === 'handoff');

  const escalationRate = total === 0 ? 0 : (escalated.length / total) * 100;
  const latencies = interactions.map((i) => i.latencyMs);

  console.log('📊 Interakciós riport');
  console.log('─'.repeat(46));
  console.log(`Összes interakció:        ${total}`);
  console.log(`  válaszolt:              ${answered.length}`);
  console.log(`  eszkalált:              ${escalated.length}`);
  console.log(`Eszkalációs arány:        ${escalationRate.toFixed(1)} %`);
  console.log(`Átlagos válaszidő:        ${Math.round(average(latencies))} ms`);
  console.log(`p90 válaszidő:            ${Math.round(percentile(latencies, 90))} ms`);
  console.log(
    `Átlagos forrás/válasz:    ${average(answered.map((i) => i.sourcesCount)).toFixed(2)}`
  );

  if (total === 0) {
    console.log('─'.repeat(46));
    console.log('(A napló üres vagy még nem létezik.)');
  }

  if (escalated.length > 0) {
    const byReason = new Map<string, number>();
    for (const i of escalated) {
      const reason = i.reason ?? 'ismeretlen';
      byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
    }
    console.log('─'.repeat(46));
    console.log('Eszkalációk oka:');
    for (const [reason, count] of byReason) {
      console.log(`  ${reason}: ${count}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
