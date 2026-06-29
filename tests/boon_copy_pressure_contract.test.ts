import { getBoonCopy } from '../app/boons/boon_copy';
import { ALL_BOON_IDS } from '../app/boons/boon_types';
import type { Lang } from '../constants/i18n';

const LANGS: Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('boon copy pressure phrases', () => {
  it('does not use vague pressure-copy in bonus subtitles', () => {
    const forbidden = [
      /Жми\s+дольше/i,
      /Тисни\s+довше/i,
      /Налетай/i,
      /Налітай/i,
      /\bGas\./i,
      /Kapışın/i,
    ];

    for (const id of ALL_BOON_IDS) {
      for (const lang of LANGS) {
        const copy = getBoonCopy(id, lang);
        for (const pattern of forbidden) {
          expect(copy.subtitle).not.toMatch(pattern);
        }
      }
    }
  });
});
