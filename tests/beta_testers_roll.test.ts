import type { BetaTesterEntry } from '../constants/beta_testers_roll';
import { BETA_TESTERS } from '../constants/beta_testers_roll';

describe('BETA_TESTERS', () => {
  it('has unique names and non-empty trilingual bios', () => {
    expect(Array.isArray(BETA_TESTERS)).toBe(true);
    expect(BETA_TESTERS.length).toBeGreaterThan(0);

    const names = new Set<string>();

    BETA_TESTERS.forEach((e: BetaTesterEntry) => {
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(0);
      expect(names.has(e.name)).toBe(false);
      names.add(e.name);

      for (const field of ['bio', 'bio_uk', 'bio_es'] as const) {
        const v = e[field]?.trim?.() ?? '';
        expect(v.length).toBeGreaterThan(40);
      }
    });
  });
});
