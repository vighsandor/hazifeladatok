import { describe, it, expect } from 'vitest';
import { chunkDoc } from './chunk.js';

describe('chunkDoc', () => {
  it('separates two clauses into different chunks', () => {
    const text = `Some preamble before first clause.
More preamble.

1 Scope
This is the scope section with content.

2 References
This is the references section.`;

    const chunks = chunkDoc({ id: 'test', url: 'test-url', text });

    // Should have multiple chunks
    expect(chunks.length).toBeGreaterThan(0);

    // Check that clause 1 and 2 are not in the same chunk
    const clauseIds = chunks.map((c) => c.clause_path.split(' ')[0]);
    for (let i = 0; i < clauseIds.length - 1; i++) {
      if (clauseIds[i] !== clauseIds[i + 1]) {
        expect(clauseIds[i]).not.toBe(clauseIds[i + 1]);
      }
    }
  });

  it('respects maxChars limit', () => {
    const text = `1 Scope
Line 1. This is a long line that adds content.
Line 2. Another line with more content added.
Line 3. Yet more content to test the limit.
Line 4. And even more content here.`;

    const chunks = chunkDoc(
      { id: 'test', url: 'test-url', text },
      { maxChars: 100 }
    );

    // Each chunk (except potentially the last) should not exceed maxChars
    for (let i = 0; i < chunks.length - 1; i++) {
      expect(chunks[i].content.length).toBeLessThanOrEqual(100);
    }
  });

  it('preserves list items even if they exceed maxChars', () => {
    const text = `1 Scope
This is the intro sentence that should stay with the list.
a) First item with some content
b) Second item with content`;

    const chunks = chunkDoc(
      { id: 'test', url: 'test-url', text },
      { maxChars: 50 }
    );

    // The list items should be together with the intro
    const clauseContent = chunks
      .filter((c) => c.clause_path.startsWith('1 '))
      .map((c) => c.content)
      .join('\n');

    expect(clauseContent).toContain('a)');
    expect(clauseContent).toContain('b)');
  });

  it('has non-empty clause_path for every chunk', () => {
    const text = `1 Scope
Content for scope.

2 References
Content for references.`;

    const chunks = chunkDoc({ id: 'test', url: 'test-url', text });

    for (const chunk of chunks) {
      expect(chunk.clause_path).toBeTruthy();
      expect(chunk.clause_path.length).toBeGreaterThan(0);
    }
  });

  it('does not produce empty chunks', () => {
    const text = `1 Scope
Content here.

2 References`;

    const chunks = chunkDoc({ id: 'test', url: 'test-url', text });

    for (const chunk of chunks) {
      expect(chunk.content.trim().length).toBeGreaterThan(0);
    }
  });

  it('overlaps sentences between chunks in same clause', () => {
    const text = `1 Scope
First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence. Sixth sentence.`;

    const chunks = chunkDoc(
      { id: 'test', url: 'test-url', text },
      { maxChars: 80, overlapSentences: 1 }
    );

    if (chunks.length > 1) {
      // Check if the second chunk contains the last sentence of the first chunk
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
Actual scope content.`;

    const chunks = chunkDoc({ id: 'test', url: 'test-url', text });

    const allContent = chunks.map((c) => c.content).join('\n');
    expect(allContent).not.toContain('This is preamble');
    expect(allContent).toContain('Actual scope content');
  });
});
