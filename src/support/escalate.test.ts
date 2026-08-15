import { describe, it, expect } from 'vitest';
import { needsHuman } from './escalate.js';

const someSources = [{ source_id: 'ETSI EN 319 132-1', clause_path: '6.1', source_url: 'x' }];

describe('needsHuman', () => {
  it('escalates as out_of_scope when noInfo is true', () => {
    expect(needsHuman({ noInfo: true, sources: someSources, topScore: 9 })).toEqual({
      escalate: true,
      reason: 'out_of_scope',
    });
  });

  it('escalates as out_of_scope when there are no sources', () => {
    expect(needsHuman({ noInfo: false, sources: [], topScore: 9 })).toEqual({
      escalate: true,
      reason: 'out_of_scope',
    });
  });

  it('escalates as low_confidence when topScore is below 6', () => {
    expect(needsHuman({ noInfo: false, sources: someSources, topScore: 4 })).toEqual({
      escalate: true,
      reason: 'low_confidence',
    });
  });

  it('does not escalate on a confident, grounded answer', () => {
    expect(needsHuman({ noInfo: false, sources: someSources, topScore: 9 })).toEqual({
      escalate: false,
      reason: null,
    });
  });

  it('does not escalate when topScore is unknown but the answer is grounded', () => {
    expect(needsHuman({ noInfo: false, sources: someSources, topScore: null })).toEqual({
      escalate: false,
      reason: null,
    });
  });
});
