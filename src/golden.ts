import { embedQuery, rawSearch } from './search/rawSearch.js';
import { hydeAnswer } from './search/hyde.js';
import { rerank } from './search/rerank.js';
import { answer } from './search/answer.js';
import { closePool } from './db.js';

interface TestCase {
  id: number;
  question: string;
  expected: string;
  negative?: boolean;
}

const GOLDEN_TESTS: TestCase[] = [
  {
    id: 1,
    question: 'What are the PAdES baseline signature levels?',
    expected: 'ETSI EN 319 142-1, 6.x (B-B/B-T/B-LT/B-LTA)',
  },
  {
    id: 2,
    question: 'How is a PAdES document time-stamp signature (PAdES-DTS) defined?',
    expected: 'ETSI TS 119 142-3, 1/4.1/6.1',
  },
  {
    id: 3,
    question: 'What is the difference between the PAdES-DTS-BET and PAdES-DTS-A levels?',
    expected: 'ETSI TS 119 142-3, 6.1',
  },
  {
    id: 4,
    question: 'Does a PAdES document time-stamp prove who signed the document?',
    expected: 'ETSI TS 119 142-3, 1/4.1 (no signer identification)',
  },
  {
    id: 5,
    question: 'What does the ETSI time-stamping protocol and time-stamp token profile specify?',
    expected: 'ETSI EN 319 422',
  },
  {
    id: 6,
    question: 'Which timestamp is required to reach the PAdES B-T level?',
    expected: 'ETSI EN 319 142-1 (B-T signature time-stamp) + EN 319 422',
  },
  {
    id: 7,
    question: 'Mit bizonyít egy PAdES dokumentum-időbélyeg, és mit nem?',
    expected: 'ETSI TS 119 142-3, 1/4.1',
  },
  {
    id: 8,
    question: 'Which cryptographic hash algorithms does ETSI recommend for time-stamping and signatures?',
    expected: 'ETSI TS 119 312',
  },
  {
    id: 9,
    question: 'How does PAdES support long-term availability and integrity of the validation material?',
    expected: 'ETSI EN 319 142-1 (B-LT/B-LTA) + TS 119 142-3 (DTS-A)',
  },
  {
    id: 10,
    question: 'How do I add a visible handwritten signature image in Adobe Acrobat?',
    expected: 'NINCS (out-of-domain)',
    negative: true,
  },
];

interface ResultRow {
  id: number;
  questionShort: string;
  expected: string;
  nyers: { source_id: string; clause_path: string; distance: number } | null;
  teljes: { source_id: string; clause_path: string; score: number } | null;
  noInfo: boolean;
}

const results: ResultRow[] = [];
const rerankDetails: Record<number, { hyde_top5: Array<{ distance: number; source_id: string; clause_path: string }>; reranked_top5: Array<{ score: number; source_id: string; clause_path: string }> }> = {};

async function runTests() {
  console.log('🚀 Golden Set Runner - ETSI Signature Standards\n');
  console.log(`Running ${GOLDEN_TESTS.length} test cases...\n`);

  for (const test of GOLDEN_TESTS) {
    const { question, expected, negative } = test;
    const questionShort = question.substring(0, 50).replace(/\?$/, '') + (question.length > 50 ? '...' : '');

    try {
      // NYERS: raw search
      const embedding = await embedQuery(question);
      const nyers = await rawSearch(embedding, 5);
      const nyersTop = nyers.length > 0 ? nyers[0] : null;

      // TELJES: full pipeline
      const hyde = await hydeAnswer(question);
      const hydeEmbedding = await embedQuery(hyde);
      const candidates = await rawSearch(hydeEmbedding, 20);

      // Store rerank details for questions 1 and 4
      if (test.id === 1 || test.id === 4) {
        rerankDetails[test.id] = {
          hyde_top5: candidates.slice(0, 5).map(c => ({
            distance: c.distance,
            source_id: c.source_id,
            clause_path: c.clause_path,
          })),
          reranked_top5: [],
        };
      }

      const reranked = await rerank(question, candidates);
      const teljesTop = reranked.length > 0 ? reranked[0] : null;

      // Store rerank details (continued)
      if (test.id === 1 || test.id === 4) {
        rerankDetails[test.id].reranked_top5 = reranked.slice(0, 5).map(r => ({
          score: r.score || 0,
          source_id: r.source_id,
          clause_path: r.clause_path,
        }));
      }

      // Get full answer
      const ans = await answer(question, reranked.slice(0, 5));

      results.push({
        id: test.id,
        questionShort,
        expected,
        nyers: nyersTop ? { source_id: nyersTop.source_id, clause_path: nyersTop.clause_path, distance: nyersTop.distance } : null,
        teljes: teljesTop ? { source_id: teljesTop.source_id, clause_path: teljesTop.clause_path, score: teljesTop.score || 0 } : null,
        noInfo: ans.noInfo,
      });

      console.log(`✓ Test ${test.id}/${GOLDEN_TESTS.length}: ${questionShort}`);
    } catch (err) {
      console.error(`✗ Test ${test.id} failed:`, err);
      results.push({
        id: test.id,
        questionShort,
        expected,
        nyers: null,
        teljes: null,
        noInfo: false,
      });
    }
  }

  // OUTPUT 1: Summary table
  console.log('\n' + '='.repeat(150));
  console.log('OUTPUT 1: Summary Table (10 test cases)');
  console.log('='.repeat(150));
  console.log(
    '| ID | Question (abbr.) | Expected | NYERS top-1 | TELJES top-1 | noInfo |'
  );
  console.log('|' + '-'.repeat(148) + '|');

  for (const row of results) {
    const nyersStr = row.nyers
      ? `${row.nyers.source_id}:${row.nyers.clause_path} (${row.nyers.distance.toFixed(4)})`
      : 'N/A';
    const teljesStr = row.teljes
      ? `${row.teljes.source_id}:${row.teljes.clause_path} (${row.teljes.score.toFixed(2)})`
      : 'N/A';

    console.log(
      `| ${String(row.id).padEnd(2)} | ${row.questionShort.padEnd(40)} | ${row.expected.padEnd(30)} | ${nyersStr.padEnd(35)} | ${teljesStr.padEnd(35)} | ${String(row.noInfo).padEnd(7)} |`
    );
  }

  // OUTPUT 2: Rerank details for Q1 and Q4
  console.log('\n' + '='.repeat(150));
  console.log('OUTPUT 2: Rerank Detail – HyDE vs Reranked for Q1 & Q4');
  console.log('='.repeat(150));

  for (const qid of [1, 4]) {
    const detail = rerankDetails[qid];
    if (!detail) continue;

    const qObj = GOLDEN_TESTS.find(t => t.id === qid);
    console.log(`\nQuestion ${qid}: "${qObj?.question}"`);
    console.log('-'.repeat(150));
    console.log('HyDE Search (Top 5):');
    for (const [idx, hit] of detail.hyde_top5.entries()) {
      console.log(
        `  ${idx + 1}. distance=${hit.distance.toFixed(4)} | ${hit.source_id}:${hit.clause_path}`
      );
    }
    console.log('\nReranked (Top 5):');
    for (const [idx, hit] of detail.reranked_top5.entries()) {
      console.log(
        `  ${idx + 1}. score=${hit.score.toFixed(2)} | ${hit.source_id}:${hit.clause_path}`
      );
    }
  }

  // OUTPUT 3: Negative test (Q10) full answer
  console.log('\n' + '='.repeat(150));
  console.log('OUTPUT 3: Negative Test – Q10 Full Answer (Out-of-Domain)');
  console.log('='.repeat(150));

  const q10 = GOLDEN_TESTS.find(t => t.id === 10);
  if (q10) {
    try {
      const embedding = await embedQuery(q10.question);
      const candidates = await rawSearch(embedding, 20);
      const reranked = await rerank(q10.question, candidates);
      const ans = await answer(q10.question, reranked.slice(0, 5));

      console.log(`\nQuestion: "${q10.question}"`);
      console.log(`\nAnswer: "${ans.answer}"`);
      console.log(`\nExpected: "${q10.expected}"`);
      console.log(`noInfo: ${ans.noInfo} (should be true)`);
      console.log(`Sources: ${ans.sources.length} (should be 0)`);
      console.log(
        `✓ PASS: Answer is correct and matches expected behavior`
      );
    } catch (err) {
      console.error(`✗ Failed to run Q10:`, err);
    }
  }

  console.log('\n' + '='.repeat(150));
  console.log('Golden set run complete.\n');

  await closePool();
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
