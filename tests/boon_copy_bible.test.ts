// Weekly Boons — соответствие текстов бонусов Библии Phraseman (Game Voice).
import { getBoonCopy } from '../app/boons/boon_copy';
import { ALL_BOON_IDS } from '../app/boons/boon_types';
import type { Lang } from '../constants/i18n';

const LANGS: Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

function allCopies(lang: Lang) {
  return ALL_BOON_IDS.map((id) => getBoonCopy(id, lang));
}

describe('boon_copy — Библия Phraseman', () => {
  it('все тексты заданы на 8 языках (непустые)', () => {
    for (const lang of LANGS) {
      for (const c of allCopies(lang)) {
        expect(c.title.trim().length).toBeGreaterThan(0);
        expect(c.subtitle.trim().length).toBeGreaterThan(0);
        expect(c.emoji.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('русские тексты НЕ содержат запрещённых слов Библии', () => {
    // урок→раунд/сессия, ошибка→попытка, статистика→результаты, купить/цена/подписка→открыть,
    // плюс не используем «прощение/грех» (религиозный пафос) и «не упусти/потеряешь» (loss-framing).
    const forbidden = [
      /\bурок/i, /\bошибк/i, /\bстатистик/i, /\bцена\b/i, /\bстоимост/i, /\bкупит/i,
      /\bподписк/i, /\bпрощени/i, /\bгрех/i, /\bне упусти/i, /\bпотеряеш/i, /\bскучали/i,
    ];
    for (const c of allCopies('ru')) {
      for (const pat of forbidden) {
        expect(`${c.title} ${c.subtitle}`).not.toMatch(pat);
      }
    }
  });

  it('заголовки короткие (≤4 слова — это названия)', () => {
    for (const c of allCopies('ru')) {
      const words = c.title.split(/\s+/).filter(Boolean).length;
      expect(words).toBeLessThanOrEqual(4);
    }
  });

  it('описания короткие (≤10 слов — когнитивная лёгкость)', () => {
    for (const c of allCopies('ru')) {
      const words = c.subtitle.split(/\s+/).filter(Boolean).length;
      expect(words).toBeLessThanOrEqual(10);
    }
  });

  it('нет восклицаний через слово (не более 1 «!» на текст)', () => {
    for (const lang of LANGS) {
      for (const c of allCopies(lang)) {
        const bangs = (`${c.title} ${c.subtitle}`.match(/!/g) ?? []).length;
        expect(bangs).toBeLessThanOrEqual(1);
      }
    }
  });
});
