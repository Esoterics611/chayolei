import { describe, expect, it } from 'vitest';
import { DICTS } from './i18n';

// CLAUDE.md: every string goes in both dictionaries.
describe('dictionaries', () => {
  const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

  it('have the same keys in English and Hebrew', () => {
    const en = Object.keys(DICTS.en).sort();
    const he = Object.keys(DICTS.he).sort();
    expect(en.filter(k => !(k in DICTS.he))).toEqual([]);
    expect(he.filter(k => !(k in DICTS.en))).toEqual([]);
  });

  it('use the same placeholders in both', () => {
    const differ = Object.keys(DICTS.en).filter(k => k in DICTS.he && vars(DICTS.en[k]).join() !== vars(DICTS.he[k]).join());
    expect(differ).toEqual([]);
  });
});
