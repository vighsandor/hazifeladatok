import { customerAsk } from './assistant.js';
import type { CustomerReply } from './assistant.js';
import { closePool } from '../db.js';

const IN_SCOPE = 'What are the PAdES baseline signature levels?';
const OUT_OF_SCOPE = 'How do I reset my billing portal password?';

const line = (char = '─') => console.log(char.repeat(70));

function printAnswer(reply: CustomerReply) {
  console.log(`Mód:          ${reply.mode}`);
  console.log(`Válaszidő:    ${reply.latencyMs} ms`);
  console.log('');
  console.log('Válasz:');
  console.log(reply.answer ?? '(nincs)');
  console.log('');
  console.log(`Források (${reply.sources?.length ?? 0}):`);
  for (const s of reply.sources ?? []) {
    console.log(`  • ${s.source_id} — ${s.clause_path}`);
    console.log(`    ${s.source_url}`);
  }
}

function printHandoff(reply: CustomerReply) {
  console.log(`Mód:          ${reply.mode}`);
  console.log(`Ok:           ${reply.reason}`);
  console.log(`Handoff id:   ${reply.handoffId}`);
  console.log(`Válaszidő:    ${reply.latencyMs} ms`);
  console.log('');
  console.log('Ügyfélnek küldött üzenet:');
  console.log(reply.answer ?? '(nincs)');
}

async function run(title: string, question: string) {
  line('═');
  console.log(title);
  console.log(`Kérdés: "${question}"`);
  line('═');

  const reply = await customerAsk(question);

  if (reply.mode === 'handoff') {
    printHandoff(reply);
  } else {
    printAnswer(reply);
  }

  console.log('');
  return reply;
}

async function main() {
  console.log('\n🎬 Ügyfélszolgálati asszisztens — end-to-end demó\n');

  const answered = await run('1) HATÓKÖRÖN BELÜL — várt: válasz forrásokkal', IN_SCOPE);
  const escalated = await run('2) HATÓKÖRÖN KÍVÜL — várt: emberi eszkaláció', OUT_OF_SCOPE);

  line();
  console.log('Összegzés:');
  console.log(`  hatókörön belül  → ${answered.mode}${answered.mode === 'answer' ? ' ✅' : ' ❌'}`);
  console.log(`  hatókörön kívül  → ${escalated.mode}${escalated.mode === 'handoff' ? ' ✅' : ' ❌'}`);
  line();
  console.log('');
}

main()
  .catch((err) => {
    console.error('❌ Demó hiba:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
