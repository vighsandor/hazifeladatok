import { describe, it, expect } from 'vitest';
import { cleanEtsiText } from './load.js';

describe('cleanEtsiText', () => {
  it('removes ETSI EN header lines', () => {
    const input = 'ETSI EN 319 122-1 v1.0.0\nSome content here\n';
    const output = cleanEtsiText(input);
    expect(output).not.toContain('ETSI EN 319 122-1');
    expect(output).toContain('Some content here');
  });

  it('removes standalone page number lines', () => {
    const input = 'Some content\n12\nMore content';
    const output = cleanEtsiText(input);
    const lines = output.split('\n');
    expect(lines).not.toContain('12');
    expect(output).toContain('Some content');
    expect(output).toContain('More content');
  });

  it('fixes line-end hyphenation', () => {
    const input = 'crypto-\ngraphic signature';
    const output = cleanEtsiText(input);
    expect(output).toContain('cryptographic');
  });

  it('preserves clause numbers and headings', () => {
    const input = '4.1.1 Signature format\nThis is important content';
    const output = cleanEtsiText(input);
    expect(output).toContain('4.1.1');
    expect(output).toContain('Signature format');
    expect(output).toContain('This is important content');
  });

  it('removes TOC lines with dot leaders', () => {
    const input = 'Some intro\nSignature creation ........... 12\nOther content';
    const output = cleanEtsiText(input);
    const lines = output.split('\n');
    expect(lines.some((l) => l.includes('Signature creation') && l.includes('...'))).toBe(false);
    expect(output).toContain('Other content');
  });
});
