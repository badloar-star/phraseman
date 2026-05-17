import fs from 'node:fs';
import path from 'node:path';
import { HEISENBERG_BATCH_SOURCE_LOCALES } from '../app/source_locales';
import { IRREGULAR_VERBS_BY_LESSON } from '../app/irregular_verbs_data';

describe('irregular verb locale glosses', () => {
  it('keeps every lesson irregular verb covered for Spanish UI', () => {
    const verbs = Object.values(IRREGULAR_VERBS_BY_LESSON).flat();
    const seen = new Map(verbs.map((verb) => [verb.base, verb]));
    const missingEs = [...seen.values()].filter((verb) => !verb.es?.trim()).map((verb) => verb.base);
    const cyrillicEs = [...seen.values()]
      .filter((verb) => /[\u0400-\u04FF]/.test(verb.es ?? ''))
      .map((verb) => verb.base);

    expect(missingEs).toEqual([]);
    expect(cyrillicEs).toEqual([]);
  });

  it('keeps every lesson irregular verb covered for planned interface source locales', () => {
    const verbs = Object.values(IRREGULAR_VERBS_BY_LESSON).flat();
    const seen = new Map(verbs.map((verb) => [verb.base, verb]));
    const missing: string[] = [];
    const cyrillic: string[] = [];

    for (const verb of seen.values()) {
      for (const locale of HEISENBERG_BATCH_SOURCE_LOCALES) {
        const text = verb.sourceLocales?.[locale]?.trim();
        if (!text) missing.push(`${verb.base}:${locale}`);
        if (/[\u0400-\u04FF]/.test(text ?? '')) cyrillic.push(`${verb.base}:${locale}`);
      }
      expect(verb.sourceLocales?.es).toBe(verb.es);
    }

    expect(missing).toEqual([]);
    expect(cyrillic).toEqual([]);
  });

  it('does not silently fall back to Russian for Spanish irregular-verb UI labels', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/lesson_irregular_verbs.tsx'), 'utf8');

    expect(source).not.toMatch(/if \(lang === 'es'\) return [^\n]*verb\.ru/);
  });
});
