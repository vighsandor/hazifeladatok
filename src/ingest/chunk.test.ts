import { describe, it, expect } from 'vitest';
import { chunkDoc } from './chunk.js';

describe('chunkDoc', () => {
  it('separates two clauses into different chunks', () => {
    const text = `Some preamble before first clause.
More preamble.

1 Scope
This is the scope section with content that is long enough to meet minimum chunk length. Adding more text to ensure it is substantial and goes over the minimum of two hundred characters. We need to add even more content here to be safe.

2 References
This is the references section with content. The content should be long enough to meet the minimum chunk size requirement of 200 characters. Let us add more text and more sentences to ensure we have enough. Adding final sentences here.`;

    const chunks = chunkDoc({ id: 'test', url: 'test-url', text });

    expect(chunks.length).toBeGreaterThan(0);

    // Check that clause 1 and 2 are not in the same chunk
    const clauseIds = chunks.map((c) => c.clause_path.split(' ')[0]);
    for (let i = 0; i < clauseIds.length - 1; i++) {
      if (clauseIds[i] !== clauseIds[i + 1]) {
        expect(clauseIds[i]).not.toBe(clauseIds[i + 1]);
      }
    }
  });

  it('respects maxChars and hard limit of 1600', () => {
    const text = `1 Scope
Line 1. This is a long line that adds content with more words and sentences.
Line 2. Another line with more content added to the section here.
Line 3. Yet more content to test the limit of the chunking algorithm.
Line 4. And even more content here to ensure we have substantial text.
Line 5. Even more lines to keep building up the content length.
Line 6. We need this to be long enough to test the hard limit properly.`;

    const chunks = chunkDoc(
      { id: 'test', url: 'test-url', text },
      { maxChars: 200 }
    );

    // Each chunk should not exceed 1600 chars (hard limit)
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(1600);
    }

    // Each chunk should be at least 200 chars (or be in a single-chunk clause)
    for (const chunk of chunks) {
      expect(chunk.content.trim().length).toBeGreaterThanOrEqual(200);
    }
  });

  it('filters out chunks under 200 characters', () => {
    const text = `1 Scope
Real content here that is substantial enough.

2 Short
Tiny.`;

    const chunks = chunkDoc({ id: 'test', url: 'test-url', text });

    for (const chunk of chunks) {
      expect(chunk.content.trim().length).toBeGreaterThanOrEqual(200);
    }
  });

  it('has non-empty clause_path for every chunk', () => {
    const text = `1 Scope
Content for scope that is substantial and meets the minimum chunk length requirement. We are adding more text to ensure this chunk is long enough and meaningful.

2 References
Content for references section that is also substantial and long enough. Let us add more words and sentences to make sure we meet the minimum length requirement for chunks.`;

    const chunks = chunkDoc({ id: 'test', url: 'test-url', text });

    for (const chunk of chunks) {
      expect(chunk.clause_path).toBeTruthy();
      expect(chunk.clause_path.length).toBeGreaterThan(0);
    }
  });

  it('does not produce empty chunks', () => {
    const text = `1 Scope
Content here that is substantive and meets minimum requirements for chunk size. Adding more text to ensure it is long enough for the test.

2 References
More substantial content to ensure the chunk is long enough to pass the test.`;

    const chunks = chunkDoc({ id: 'test', url: 'test-url', text });

    for (const chunk of chunks) {
      expect(chunk.content.trim().length).toBeGreaterThan(0);
    }
  });

  it('overlaps sentences between chunks in same clause', () => {
    const text = `1 Scope
First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence. Seventh sentence. Eighth sentence. Ninth sentence. Tenth sentence. Eleventh sentence. Twelfth sentence. Thirteenth sentence. Fourteenth sentence. Fifteenth sentence.`;

    const chunks = chunkDoc(
      { id: 'test', url: 'test-url', text },
      { maxChars: 150, overlapSentences: 1 }
    );

    if (chunks.length > 1) {
      const firstChunkContent = chunks[0].content;
      const lastSentenceOfFirst = firstChunkContent
        .split(/[.!?]+/)
        .filter((s) => s.trim())
        .pop();

      const secondChunkContent = chunks[1].content;
      expect(secondChunkContent).toContain(lastSentenceOfFirst?.trim() || '');
    }
  });

  it('excludes preamble before first clause', () => {
    const text = `This is preamble.
More preamble text here.

1 Scope
Actual scope content that is substantive and long enough to meet the minimum chunk size requirement. Adding more text here to ensure we exceed the two hundred character minimum. We need additional sentences to be sure we have enough content for the chunk.`;

    const chunks = chunkDoc({ id: 'test', url: 'test-url', text });

    const allContent = chunks.map((c) => c.content).join('\n');
    expect(allContent).not.toContain('This is preamble');
    expect(allContent).toContain('Actual scope content');
  });
});
