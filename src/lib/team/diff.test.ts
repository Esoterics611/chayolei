import { describe, expect, it } from 'vitest';
import { fakeHash } from './ledger';
import { diffParagraphs, diffStats, diffWords } from './diff';

describe('diffWords', () => {
  it('marks inserted and deleted words', () => {
    const ops = diffWords('the obligation begins at night', 'the obligation of Shema begins at night');
    expect(ops.filter(o => o.op === 'ins').map(o => o.text.trim())).toEqual(['of Shema']);
    expect(ops.some(o => o.op === 'del')).toBe(false);
  });
});

describe('diffParagraphs', () => {
  it('keeps identical paragraphs, pairs edited ones and reports new ones', () => {
    const d = diffParagraphs(
      ['Opening line here.', 'Middle stays.', 'Old ending.'],
      ['Opening line, tightened here.', 'Middle stays.', 'Old ending.', 'A new paragraph citing Rashi.'],
    );
    expect(d.map(p => p.kind)).toEqual(['changed', 'same', 'same', 'added']);
    expect(diffStats(d)).toEqual({ added: 1, removed: 0, changed: 1 });
  });

  it('treats unrelated replacements as removed + added', () => {
    const d = diffParagraphs(['Completely different text.'], ['Nothing in common whatsoever here.']);
    expect(d.map(p => p.kind)).toEqual(['removed', 'added']);
  });

  it('handles a first version against nothing', () => {
    expect(diffParagraphs([], ['One.', 'Two.']).map(p => p.kind)).toEqual(['added', 'added']);
  });
});

describe('fakeHash', () => {
  it('fills the requested length without repeating a 4-byte block', () => {
    const h = fakeHash('Each chapter was translated, reviewed and accepted.', 16);
    expect(h).toMatch(/^0x[0-9a-f]{32}$/);
    const blocks = h.slice(2).match(/.{8}/g)!;
    expect(new Set(blocks).size).toBe(blocks.length);
  });
});
