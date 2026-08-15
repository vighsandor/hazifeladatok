import { customerAsk } from './assistant.js';
import { closePool } from '../db.js';

/**
 * Sample traffic for the interaction log: real ETSI e-signature questions that the
 * knowledge base can answer, plus out-of-scope ones that must reach a human.
 */

const IN_SCOPE: string[] = [
  'What are the PAdES baseline signature levels?',
  'What is the difference between the CAdES B-T and B-LT levels?',
  'Which signed attributes are mandatory in a CAdES baseline signature?',
  'How does a XAdES signature reference the signing certificate?',
  'What is the purpose of the signature time-stamp attribute?',
  'What are the requirements for the archive time-stamp in XAdES?',
  'Which validation data must be present at the B-LT level?',
  'What are the possible status indications of the signature validation process?',
  'How is a document time-stamp represented in a PAdES B-LTA signature?',
  'What obligations does a trust service provider have regarding certificate revocation status?',
  'What are the requirements for qualified certificates for electronic signatures?',
  'How are certificate policies identified in ETSI EN 319 411-1?',
  'Which cryptographic hash functions are recommended for electronic signatures?',
  'What is the difference between ASiC-S and ASiC-E containers?',
  'What are the requirements for a time-stamp token issued by a TSA?',
];

const OUT_OF_SCOPE: string[] = [
  'How do I reset my billing portal password?',
  'What is your refund policy for annual subscriptions?',
  'What are your office opening hours in Budapest?',
  'How can I change the shipping address on my last order?',
  'What will the weather be like in Vienna tomorrow?',
];

async function main() {
  const questions = [
    ...IN_SCOPE.map((q) => ({ q, expected: 'answer' as const })),
    ...OUT_OF_SCOPE.map((q) => ({ q, expected: 'handoff' as const })),
  ];

  console.log(
    `\n🌱 Minta-forgalom: ${IN_SCOPE.length} hatókörön belüli + ${OUT_OF_SCOPE.length} hatókörön kívüli kérdés\n`
  );

  let answered = 0;
  let escalated = 0;
  let asExpected = 0;

  for (const [i, { q, expected }] of questions.entries()) {
    const num = `${String(i + 1).padStart(2, ' ')}/${questions.length}`;

    try {
      const reply = await customerAsk(q);

      if (reply.mode === 'answer') answered++;
      else escalated++;
      if (reply.mode === expected) asExpected++;

      const detail =
        reply.mode === 'answer'
          ? `${reply.sources?.length ?? 0} forrás`
          : `${reply.reason} / ${reply.handoffId}`;

      console.log(
        `${num} ${reply.mode === expected ? '✅' : '⚠️ '} [${reply.mode}] ${reply.latencyMs} ms — ${detail}\n       "${q}"`
      );
    } catch (err) {
      console.error(`${num} ❌ hiba — "${q}"`);
      console.error(`       ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`Lefutott: ${questions.length} kérdés`);
  console.log(`  válasz:     ${answered}`);
  console.log(`  eszkaláció: ${escalated}`);
  console.log(`  a várt módban: ${asExpected}/${questions.length}`);
  console.log('─'.repeat(60));
  console.log('\nRiport: npm run report\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed hiba:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
